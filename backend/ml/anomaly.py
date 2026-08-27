from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

_BASE_DIR = Path(__file__).resolve().parent.parent
_DATA_DIR = _BASE_DIR / "data"
_CACHE_DIR = _BASE_DIR / "ml" / "cache"

_DEFAULT_XLSX_NAME = "Capstone_ERP_Cleaned_Final (1).xlsx"
_MODEL_NAME = "isolation_forest_transactions.joblib"
_FEATURES = [
    "quantity_sold",
    "sales_amount",
    "current_stock",
    "reorder_level",
    "price",
    "promo",
    "cost_price",
    "total_cost",
    "profit",
    "lag_7",
]
_ID_COLS = ["transaction_id", "product_id", "branch_id", "sale_date"]

_IF_PARAMS = {
    "n_estimators": 200,
    "contamination": 0.02,
    "random_state": 42,
}


@dataclass
class AnomalyResult:
    summary: dict[str, Any]
    anomalies: list[dict[str, Any]]
    all_results: list[dict[str, Any]]
    model_path: str


def _find_xlsx_path() -> Path:
    explicit = _DATA_DIR / _DEFAULT_XLSX_NAME
    if explicit.exists():
        return explicit
    for path in sorted(_DATA_DIR.glob("*.xlsx")):
        return path
    raise FileNotFoundError(
        f"No ERP Excel file found in {_DATA_DIR}. Expected {_DEFAULT_XLSX_NAME}."
    )


def load_transactions() -> pd.DataFrame:
    xlsx_path = _find_xlsx_path()
    df = pd.read_excel(xlsx_path, sheet_name="Transactions")
    required = set(_FEATURES + _ID_COLS)
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"Transactions sheet missing required columns: {sorted(missing)}"
        )
    return df


def _validate_and_prepare(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    work["sale_date"] = pd.to_datetime(work["sale_date"], errors="coerce")

    numeric_cols = _FEATURES
    for col in numeric_cols:
        work[col] = pd.to_numeric(work[col], errors="coerce")

    bad_rows = work[numeric_cols].isna().any(axis=1).sum()
    if bad_rows:
        work = work.dropna(subset=numeric_cols).reset_index(drop=True)

    for col in numeric_cols:
        work[col] = work[col].replace([np.inf, -np.inf], np.nan)

    work = work.dropna(subset=numeric_cols).reset_index(drop=True)
    return work


def _explain_anomaly(row: pd.Series, means: pd.Series, stds: pd.Series) -> str:
    deviations: list[tuple[float, str]] = []
    for feature in _FEATURES:
        value = float(row[feature])
        mean = float(means[feature])
        std = float(stds[feature]) if float(stds[feature]) > 0 else 1.0
        z = (value - mean) / std
        if abs(z) >= 1.5:
            deviations.append(
            (abs(z), f"{feature} {value:,.2f} vs avg {mean:,.2f} ({z:+.1f} sd)")
        )
    if not deviations:
        return "Unusual combined pattern across multiple transaction features."
    deviations.sort(reverse=True)
    top = [msg for _, msg in deviations[:3]]
    return "Most deviant dimensions: " + "; ".join(top)


def _ensure_cache_dir() -> Path:
    os.makedirs(_CACHE_DIR, exist_ok=True)
    return _CACHE_DIR


def train_and_score(
    refresh_cache: bool = False,
) -> AnomalyResult:
    df = load_transactions()
    prepared = _validate_and_prepare(df)

    cache_dir = _ensure_cache_dir()
    model_path = cache_dir / _MODEL_NAME

    if refresh_cache or not model_path.exists():
        model = IsolationForest(**_IF_PARAMS)
        model.fit(prepared[_FEATURES])
        joblib.dump(model, model_path)
    else:
        model = joblib.load(model_path)

    X = prepared[_FEATURES]
    raw_scores = model.decision_function(X)
    labels = model.predict(X)

    prepared["anomaly_score"] = raw_scores
    prepared["is_anomaly"] = np.where(labels == -1, True, False)

    means = X.mean()
    stds = X.std()

    prepared["explanation"] = prepared.apply(
        lambda r: _explain_anomaly(r, means, stds) if bool(r["is_anomaly"]) else "",
        axis=1,
    )

    anomaly_mask = prepared["is_anomaly"] == True
    anomalies_df = prepared[anomaly_mask].sort_values(
        by="anomaly_score", ascending=True
    )
    normal_df = prepared[~anomaly_mask]

    total_rows = int(len(prepared))
    total_anomalies = int(anomaly_mask.sum())
    contamination_rate = (total_anomalies / total_rows) if total_rows else 0.0

    per_product = (
        anomalies_df.groupby("product_id")
        .size()
        .sort_values(ascending=False)
        .to_dict()
    )
    per_branch = (
        anomalies_df.groupby("branch_id")
        .size()
        .sort_values(ascending=False)
        .to_dict()
    )

    summary = {
        "total_rows": total_rows,
        "dropped_missing_rows": int(len(df) - len(prepared)),
        "total_anomalies": total_anomalies,
        "contamination_rate": contamination_rate,
        "normal_rows": int(len(normal_df)),
        "features_used": list(_FEATURES),
        "model_params": dict(_IF_PARAMS),
        "anomalies_per_product": per_product,
        "anomalies_per_branch": per_branch,
        "score_range": {
            "min_anomaly": float(anomalies_df["anomaly_score"].min())
            if total_anomalies
            else None,
            "max_anomaly": float(anomalies_df["anomaly_score"].max())
            if total_anomalies
            else None,
            "min_normal": float(normal_df["anomaly_score"].min())
            if len(normal_df)
            else None,
            "max_normal": float(normal_df["anomaly_score"].max())
            if len(normal_df)
            else None,
        },
        "model_path": str(model_path),
    }

    export_cols = _ID_COLS + list(_FEATURES) + [
        "anomaly_score",
        "is_anomaly",
        "explanation",
    ]

    def _to_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
        records = []
        for _, row in frame[export_cols].iterrows():
            rec: dict[str, Any] = {}
            for col in export_cols:
                v = row[col]
                if pd.isna(v):
                    rec[col] = None
                elif isinstance(v, pd.Timestamp):
                    rec[col] = v.strftime("%Y-%m-%d")
                elif isinstance(v, (np.integer,)):
                    rec[col] = int(v)
                elif isinstance(v, (np.floating,)):
                    rec[col] = float(v)
                elif isinstance(v, (np.bool_,)):
                    rec[col] = bool(v)
                else:
                    rec[col] = v
            records.append(rec)
        return records

    return AnomalyResult(
        summary=summary,
        anomalies=_to_records(anomalies_df),
        all_results=_to_records(prepared.sort_values(by="anomaly_score", ascending=True)),
        model_path=str(model_path),
    )


if __name__ == "__main__":
    result = train_and_score(refresh_cache=True)
    print(f"Total rows       : {result.summary['total_rows']}")
    print(f"Anomalies found  : {result.summary['total_anomalies']}")
    print(f"Rate             : {result.summary['contamination_rate']:.2%}")
    print(f"Model cached at  : {result.model_path}")
    print("\nTop 5 anomalies:")
    for item in result.anomalies[:5]:
        print(
            f"  - {item['transaction_id']} ({item['product_id']}, "
            f"{item['branch_id']}, {item['sale_date']}) score={item['anomaly_score']:.4f}"
        )
        print(f"    {item['explanation']}")
