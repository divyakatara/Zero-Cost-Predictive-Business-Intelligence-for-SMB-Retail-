# Isolation Forest anomaly detection: methodology and limitations

All numbers come from `analysis/research_metrics.py` → `analysis/results.json`.

> **The model has no ground-truth validation.** It is unsupervised and the dataset has no labelled anomalies, so its precision and recall cannot be measured. **The count of 73 anomalies is a direct consequence of the `contamination = 0.02` setting** (2% of 3,650 rows), not an independent finding about how many anomalies the data contains.

## Where it runs

`backend/ml/anomaly.py` trains the model. `backend/routes/anomaly.py` serves it (`/anomaly/summary`, `/anomaly/anomalies`, `/anomaly/suppliers/{code}`) to the business and supplier Alerts pages. It reads the `Transactions` sheet of the demo workbook, not the database. The fitted model is cached in `backend/ml/cache/isolation_forest_transactions.joblib`, and `?refresh=true` retrains it.

## Model

| Setting | Value | Meaning |
|---|---|---|
| Algorithm | `sklearn.ensemble.IsolationForest` | Isolates points with random splits; points isolated in few splits are anomalous |
| `n_estimators` | 200 | Number of trees |
| `contamination` | **0.02** | **An input assumption:** the fraction of rows to label anomalous |
| `random_state` | 42 | Makes training reproducible |

**Features (10, behavioural only, with no IDs or dates):** `quantity_sold`, `sales_amount`, `current_stock`, `reorder_level`, `price`, `promo`, `cost_price`, `total_cost`, `profit`, `lag_7`.

Rows with missing or non-numeric feature values are dropped. None are dropped in the demo data: all 3,650 rows are scored. The features are not scaled. Isolation Forest splits each feature independently, so it doesn't require scaling.

## How each flag is explained (`_explain_anomaly`)

For each flagged row, the code computes a z-score per feature (value minus the dataset mean, divided by the dataset standard deviation). It lists **up to three features with |z| ≥ 1.5**, largest first, for example *"quantity_sold 120 vs avg 34.47 (+4.6 sd)"*. If no single feature passes 1.5 sd, the row is described as an *"unusual combined pattern"*.

This explanation is a **post-hoc univariate summary**. It is not how the forest decided. The forest can isolate a row because of a combination of features that individually look ordinary.

## What it flags on the demo data

- **73 of 3,650 rows** are flagged, exactly 2% as configured.
- **Changing `contamination` changes the count mechanically:** 0.01 gives 37 rows, 0.02 gives 73 and 0.05 gives 183.
- **By product:** `item_4` 18, `item_6` 18, `item_2` 14, `item_3` 13, `item_1` 7, `item_5` 3. The other four products have none.
- **Promotions are heavily over-represented.** 72.6% of flagged rows are promo days, against 10.25% of all rows.
- **Largest-|z| feature among flagged rows:** `promo` 29, `quantity_sold` 26, `total_cost` 10, `lag_7` 6, `profit` 2.

So in this dataset, the model mostly surfaces **promotion days and demand spikes**. Those are real deviations from typical behaviour, but they are not necessarily errors or fraud. A business would usually expect them.

## Stability across random seeds

The production seed (42) was compared with seeds 0 to 4, keeping the other parameters the same:

- **Pairwise Jaccard overlap** of the flagged sets: minimum 0.759, mean 0.833.
- **59 of 73 rows are flagged by all five seeds.**

The core of the flagged set is stable. Roughly a fifth of it changes with the seed, which is typical near the contamination cut-off.

## Limitations

1. **No ground truth.** No labelled anomalies exist, so there is no precision, recall or F1. The model can be described, but not validated.
2. **`contamination` sets the count.** Reporting "73 anomalies detected" as a finding would be circular.
3. **It trains and scores on the same data**, which is normal for unsupervised outlier detection but means there is no held-out check.
4. **Global, not per product.** One forest covers all products. Products with naturally higher volume or price can look anomalous relative to the whole dataset. A per-product or per-category model would change what gets flagged.
5. **Correlated, derived features.** `sales_amount`, `total_cost` and `profit` are all computed from quantity × price or cost (see `dataset.md`), so a quantity spike is counted several times.
6. **Explanations are post-hoc** z-scores, not the model's internal reasoning.
7. **Synthetic data.** Nothing here generalises to real transactions.
8. **Reproducible but frozen.** The committed model file reproduces the 73 rows (checked in `backend/tests/test_ml.py`). Retraining with a different seed or different data changes the set.
