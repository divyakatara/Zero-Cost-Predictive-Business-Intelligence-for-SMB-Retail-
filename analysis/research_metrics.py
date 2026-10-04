"""Reproducible numbers for the research write-ups in docs/.

Not part of the shipped app. Run from the repo root:

    python analysis/research_metrics.py

It reads only the demo workbook (backend/data/), reuses the production
feature-building and scoring code where it exists, and writes
analysis/results.json. Every figure quoted in docs/*.md comes from that file.
Deterministic: same workbook -> same output.
"""
import json
import math
import sys
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.tree import DecisionTreeRegressor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from ml import anomaly as anomaly_module  # noqa: E402

WORKBOOK = ROOT / "backend" / "data" / "Capstone_ERP_Cleaned_Final (1).xlsx"
OUT = Path(__file__).resolve().parent / "results.json"

# Same as routes/inventory.py (kept in sync by hand; the route module needs a DB).
DT_FEATURES = ["weekday", "month", "is_weekend", "promo", "lag_1", "lag_7"]
DT_PARAMS = {"max_depth": 6, "random_state": 42}
TEST_FRACTION = 0.2


def r(x, digits=3):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), digits)


# ── Dataset (#44) ───────────────────────────────────────────────────────────

def dataset_summary(xl):
    tx = xl.parse("Transactions")
    sheets = {name: {"rows": int(xl.parse(name).shape[0]), "columns": list(map(str, xl.parse(name).columns))} for name in xl.sheet_names}
    return {
        "sheets": sheets,
        "transactions": int(len(tx)),
        "date_range": [str(tx["sale_date"].min().date()), str(tx["sale_date"].max().date())],
        "distinct_days": int(tx["sale_date"].nunique()),
        "products": int(tx["product_id"].nunique()),
        "branches": tx["branch_id"].value_counts().to_dict(),
        "suppliers_in_master": int(xl.parse("suppliers").shape[0]),
        "suppliers_supplying_products": sorted(xl.parse("products")["supplier_id"].unique().tolist()),
        "rows_per_product": int(tx.groupby("product_id").size().iloc[0]),
        "rows_per_product_day": int(tx.groupby(["product_id", "sale_date"]).size().max()),
        "promo_share": r(tx["promo"].mean(), 4),
        "quantity_sold": {k: r(v, 2) for k, v in tx["quantity_sold"].describe().items()},
        "total_revenue": r(tx["sales_amount"].sum(), 2),
        "total_profit": r(tx["profit"].sum(), 2),
        "data_notes": xl.parse("Data Notes").to_dict("records"),
    }


# ── Decision Tree evaluation (#23) ──────────────────────────────────────────

def training_frame(product_rows):
    """Mirror of routes.inventory.build_training_frame on workbook rows."""
    data = product_rows.sort_values("sale_date")[["weekday", "month", "is_weekend", "promo", "quantity_sold"]].copy()
    data["lag_1"] = data["quantity_sold"].shift(1)
    data["lag_7"] = data["quantity_sold"].shift(7)
    return data.dropna(subset=["lag_1", "lag_7"]).astype(int).reset_index(drop=True)


def metrics(y_true, y_pred):
    return {
        "mae": r(mean_absolute_error(y_true, y_pred)),
        "rmse": r(math.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": r(r2_score(y_true, y_pred)),
    }


def decision_tree_evaluation(tx):
    per_product = {}
    pooled = {"y": [], "tree": [], "lag1": [], "lag7": [], "train_mean": []}
    for code, rows in sorted(tx.groupby("product_id"), key=lambda kv: int(kv[0].split("_")[1])):
        data = training_frame(rows)
        split = int(len(data) * (1 - TEST_FRACTION))  # chronological: no future leaks into training
        train, test = data.iloc[:split], data.iloc[split:]
        model = DecisionTreeRegressor(**DT_PARAMS).fit(train[DT_FEATURES], train["quantity_sold"])
        pred = model.predict(test[DT_FEATURES])
        y = test["quantity_sold"].to_numpy()
        train_mean = np.full(len(y), train["quantity_sold"].mean())
        per_product[code] = {
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
            "test_period_start_row": int(split),
            "decision_tree": metrics(y, pred),
            "baseline_lag_1": metrics(y, test["lag_1"]),
            "baseline_lag_7": metrics(y, test["lag_7"]),
            "baseline_train_mean": metrics(y, train_mean),
            "test_mean_demand": r(y.mean(), 2),
            "feature_importance": {f: r(v) for f, v in zip(DT_FEATURES, model.feature_importances_)},
        }
        pooled["y"].extend(y)
        pooled["tree"].extend(pred)
        pooled["lag1"].extend(test["lag_1"])
        pooled["lag7"].extend(test["lag_7"])
        pooled["train_mean"].extend(train_mean)
    return {
        "method": "Per-product DecisionTreeRegressor(max_depth=6, random_state=42); chronological split, last 20% of each product's days held out",
        "features": DT_FEATURES,
        "target": "quantity_sold (units per product per day)",
        "pooled": {
            "decision_tree": metrics(pooled["y"], pooled["tree"]),
            "baseline_lag_1": metrics(pooled["y"], pooled["lag1"]),
            "baseline_lag_7": metrics(pooled["y"], pooled["lag7"]),
            "baseline_train_mean": metrics(pooled["y"], pooled["train_mean"]),
            "test_rows": len(pooled["y"]),
        },
        "per_product": per_product,
    }


# ── Isolation Forest (#26) ──────────────────────────────────────────────────

def isolation_forest_analysis(tx):
    prepared = anomaly_module._validate_and_prepare(tx)
    X = prepared[anomaly_module._FEATURES]
    params = dict(anomaly_module._IF_PARAMS)

    def flagged(**overrides):
        model = IsolationForest(**{**params, **overrides}).fit(X)
        return set(np.flatnonzero(model.predict(X) == -1))

    production = flagged()
    seeds = {seed: flagged(random_state=seed) for seed in range(5)}
    jaccards = [len(seeds[a] & seeds[b]) / len(seeds[a] | seeds[b]) for a, b in combinations(seeds, 2)]
    in_all_seeds = set.intersection(*seeds.values())

    flagged_rows = prepared.iloc[sorted(production)]
    stds = X.std().replace(0, 1)
    z = ((flagged_rows[anomaly_module._FEATURES] - X.mean()) / stds).abs()
    top_feature_counts = z.idxmax(axis=1).value_counts().to_dict()

    return {
        "params": params,
        "features": list(anomaly_module._FEATURES),
        "rows_scored": int(len(X)),
        "anomalies": len(production),
        "expected_from_contamination": round(params["contamination"] * len(X), 1),
        "count_by_contamination": {str(c): len(flagged(contamination=c)) for c in (0.01, 0.02, 0.05)},
        "seed_stability": {
            "seeds": list(seeds),
            "pairwise_jaccard_min": r(min(jaccards)),
            "pairwise_jaccard_mean": r(sum(jaccards) / len(jaccards)),
            "flagged_by_every_seed": len(in_all_seeds),
        },
        "anomalies_per_product": flagged_rows["product_id"].value_counts().to_dict(),
        "anomalies_per_branch": flagged_rows["branch_id"].value_counts().to_dict(),
        "promo_share_flagged": r(flagged_rows["promo"].mean(), 4),
        "promo_share_all": r(prepared["promo"].mean(), 4),
        "most_deviant_feature_counts": {k: int(v) for k, v in top_feature_counts.items()},
    }


# ── Supplier weighted scoring and sensitivity (#27, #45) ────────────────────

WEIGHT_SETS = {
    "production (30/30/20/20)": (0.30, 0.30, 0.20, 0.20),
    "equal (25/25/25/25)": (0.25, 0.25, 0.25, 0.25),
    "delivery-heavy (20/20/30/30)": (0.20, 0.20, 0.30, 0.30),
    "cost-heavy (50/20/15/15)": (0.50, 0.20, 0.15, 0.15),
    "quality-heavy (20/50/15/15)": (0.20, 0.50, 0.15, 0.15),
}


def supplier_components(xl):
    """Same normalisation as csv_loader.load_excel_tables."""
    sup, prod = xl.parse("suppliers"), xl.parse("products")
    cost = prod.groupby("supplier_id")["cost_price"].mean().rename("average_cost").reset_index()
    data = sup.merge(cost, on="supplier_id", how="left")
    imputed = data.loc[data["average_cost"].isna(), "supplier_id"].tolist()
    for col in ["average_cost", "quality_score", "lead_time_days", "reliability_score"]:
        data[col] = pd.to_numeric(data[col], errors="coerce")
        data[col] = data[col].fillna(data[col].median())

    def lower(col):
        lo, hi = col.min(), col.max()
        return pd.Series(100.0, index=col.index) if hi == lo else (hi - col) / (hi - lo) * 100

    def higher(col):
        lo, hi = col.min(), col.max()
        return pd.Series(100.0, index=col.index) if hi == lo else (col - lo) / (hi - lo) * 100

    data["cost_score"] = lower(data["average_cost"])
    data["quality_norm"] = higher(data["quality_score"])
    data["delivery_score"] = lower(data["lead_time_days"])
    data["reliability_norm"] = higher(data["reliability_score"])
    return data, imputed


def kendall_tau(order_a, order_b):
    pos_b = {s: i for i, s in enumerate(order_b)}
    concordant = discordant = 0
    for x, y in combinations(order_a, 2):
        (concordant := concordant + 1) if pos_b[x] < pos_b[y] else (discordant := discordant + 1)
    return (concordant - discordant) / (concordant + discordant)


def supplier_sensitivity(xl):
    data, imputed = supplier_components(xl)
    results = {}
    baseline_order = None
    for name, (wc, wq, wd, wr) in WEIGHT_SETS.items():
        score = data["cost_score"] * wc + data["quality_norm"] * wq + data["delivery_score"] * wd + data["reliability_norm"] * wr
        ranked = data.assign(score=score).sort_values(["score", "supplier_id"], ascending=[False, True])
        order = ranked["supplier_id"].tolist()
        baseline_order = baseline_order or order
        results[name] = {
            "order": order,
            "scores": {s: r(v, 1) for s, v in zip(ranked["supplier_id"], ranked["score"])},
            "kendall_tau_vs_production": r(kendall_tau(baseline_order, order)),
            "top_supplier": order[0],
        }
    components = data.set_index("supplier_id")[["average_cost", "quality_score", "lead_time_days", "reliability_score", "cost_score", "quality_norm", "delivery_score", "reliability_norm"]]
    return {
        "components": {s: {k: r(v, 2) for k, v in row.items()} for s, row in components.iterrows()},
        "average_cost_imputed_for": imputed,
        "weight_sets": results,
    }


def main():
    xl = pd.ExcelFile(WORKBOOK)
    tx = xl.parse("Transactions")
    results = {
        "dataset": dataset_summary(xl),
        "decision_tree": decision_tree_evaluation(tx),
        "isolation_forest": isolation_forest_analysis(tx),
        "supplier_scoring": supplier_sensitivity(xl),
    }
    OUT.write_text(json.dumps(results, indent=2, default=str), encoding="utf8")
    dt = results["decision_tree"]["pooled"]
    print("Decision Tree (pooled test):", dt["decision_tree"], "| lag_1:", dt["baseline_lag_1"], "| lag_7:", dt["baseline_lag_7"], "| mean:", dt["baseline_train_mean"])
    print("Isolation Forest:", results["isolation_forest"]["anomalies"], "anomalies;", results["isolation_forest"]["seed_stability"])
    for name, res in results["supplier_scoring"]["weight_sets"].items():
        print(f"{name:32s} {res['order']}  tau={res['kendall_tau_vs_production']}")
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
