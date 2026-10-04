# Methodology and limitations

A single write-up of the three analytical techniques in Smart ERP, intended for the methodology and discussion sections of the paper. Every number here comes from `analysis/research_metrics.py` (output: `analysis/results.json`). The script is deterministic and reads only the demo workbook. Details for each technique:

- `dataset.md`: the data and its provenance
- `decision_tree_evaluation.md`: demand forecasting
- `isolation_forest.md`: anomaly detection
- `supplier_scoring.md`: supplier ranking and weight sensitivity

## 1. Data

All three techniques use one **synthetic** workbook built for this prototype. It holds 3,650 transactions: 10 products, one row per product per day across 2023, split over two Bengaluru branches. It also covers 5 suppliers (only 3 of which supply products) and per-product stock and reorder levels. The financial columns are derived from quantity × price/cost, and the supplier quality and reliability fields were added for scoring.

**Consequence for every result below:** they show that the methods work and how they behave on this data. They are **not evidence about real retail operations**.

## 2. Demand forecasting: Decision Tree regression

**Purpose.** Predict tomorrow's units sold per product, and turn that into a suggested reorder quantity on the Inventory page.

**Method.** One `DecisionTreeRegressor(max_depth=6, random_state=42)` per product. The target is daily `quantity_sold`. The features are `weekday`, `month`, `is_weekend`, `promo`, and two lags: `lag_1` and `lag_7`, rebuilt from the product's own series. The app trains on all history, caches the tree, and retrains when the product's sales change. The suggested order is `max(0, predicted + reorder_level − stock)`.

**Evaluation.** A chronological 80/20 split per product: train on 8 Jan–20 Oct 2023 (286 days) and test on 21 Oct–31 Dec 2023 (72 days). The tree is compared with three naive baselines.

| Pooled over 720 test product-days | MAE | RMSE | R² |
|---|---:|---:|---:|
| Decision Tree | 5.39 | 9.23 | 0.625 |
| Same day last week (lag_7) | 6.62 | 11.28 | 0.440 |
| Training-period mean | 9.18 | 11.72 | 0.395 |
| Yesterday (lag_1) | 7.41 | 12.21 | 0.344 |

**Findings.**
- The tree has the **lowest MAE on all 10 products**, though only narrowly over lag_7 on two of them.
- **Within-product fit is weak.** Per-product R² has a median of 0.12 and is negative for 4 of 10 products. The higher pooled R² mostly reflects the tree getting each product's demand level right.
- Month and weekly seasonality (`lag_7`) carry most of the signal, followed by promotions.

## 3. Anomaly detection: Isolation Forest

**Purpose.** Surface unusual transactions on the Alerts pages.

**Method.** `IsolationForest(n_estimators=200, contamination=0.02, random_state=42)` on 10 behavioural numeric features, with no IDs or dates. Each flagged row gets an explanation listing up to three features at |z| ≥ 1.5.

**Results.**
- 73 of 3,650 rows are flagged. **That is exactly 2%, because `contamination = 0.02` says so**; with 0.01 it is 37 and with 0.05 it is 183.
- 72.6% of flagged rows are promotion days, against 10.25% of all rows. The flags concentrate on `item_4` and `item_6` (18 each).
- Across five random seeds, the flagged sets overlap with a mean pairwise Jaccard of 0.83, and 59 rows are flagged by every seed.

**Findings.** The model mainly surfaces promotion days and demand spikes. **It can be described but not validated:** without labelled anomalies there is no precision or recall, and the count of 73 is an input assumption, not a finding.

## 4. Supplier ranking: weighted multi-criteria scoring

**Purpose.** Rank suppliers for the Supplier Marketplace and the procurement agent's recommendations.

**Method.** Min–max normalise four criteria to 0–100: average product cost (lower is better), quality, lead time (lower is better) and reliability. Then combine them as **30% cost + 30% quality + 20% delivery + 20% reliability**.

**Rationale.** The weights are a stated design choice for thin-margin small retailers, with cost and quality first. Price, delivery and quality are among the most-cited supplier-selection criteria in the literature (Weber et al., 1991), but earlier work ranks delivery above price (Dickson, 1966). The split is therefore presented as an assumption and tested for sensitivity, not claimed as optimal.

**Result.** supplier_1 (80.9) > supplier_4 (78.9) > supplier_2 (67.0) > supplier_5 (36.9) > supplier_3 (0.0).

**Sensitivity.** The order is unchanged under equal weights and delivery-heavy weights (τ = 1.0). It changes at the top only with strong emphasis: 50% on cost puts supplier_2 first (τ = 0.6), and 50% on quality puts supplier_4 first (τ = 0.8). The bottom two never move.

## 5. Human-in-the-loop procurement (how the pieces connect)

The procurement agent does deterministic replenishment analysis, using a reorder-point and safety-stock formula with lead time plus a 3-day buffer. It picks the product's supplier using the ranking above, and drafts a supplier message (with Gemini, or a deterministic fallback). **Nothing is ordered without explicit human approval.** Every step is logged as an `AgentAction`, and the database enforces at most one pending draft per product. All orders are simulated; none reach a real supplier. See `agentic_ai_procurement.md`.

## 6. Limitations (consolidated)

| # | Limitation | Affects |
|---|---|---|
| 1 | **Synthetic data.** No result generalises to real stores, suppliers or fraud. | All |
| 2 | **One year of data and one chronological split.** There is no rolling-origin validation; November and December appear only in the test period. | Forecasting |
| 3 | **Weak within-product accuracy** (median R² 0.12, 4/10 negative), despite beating every baseline on MAE. | Forecasting |
| 4 | **No hyperparameter tuning and no uncertainty intervals.** The forecast assumes promo = 0. | Forecasting |
| 5 | **No ground truth for anomalies.** The model is unvalidated; the anomaly count is set by `contamination`. | Anomaly detection |
| 6 | **One global model** over correlated, derived features. A quantity spike counts several times. | Anomaly detection |
| 7 | **Explanations are post-hoc z-scores**, not the model's internal reasoning. | Anomaly detection |
| 8 | **Weights are an assumption.** The top-3 order depends on them under strong emphasis. | Supplier ranking |
| 9 | **n = 5 suppliers, two with imputed cost.** Min–max scaling is sensitive to the extremes. | Supplier ranking |
| 10 | **Static scores** that don't learn from purchase outcomes. Each product has only one linked supplier. | Supplier ranking, procurement |
| 11 | **Simulated orders only.** No real supplier integration or delivery feedback loop. | Procurement |

## 7. Reproducing the numbers

```bash
python analysis/research_metrics.py   # rewrites analysis/results.json, prints the headline figures
```

The regression checks in `backend/tests/test_ml.py` assert the Isolation Forest's 73/3,650 result and the Decision Tree's output shape on the same workbook.
