# Decision Tree demand forecast: evaluation

All numbers come from `analysis/research_metrics.py` → `analysis/results.json`. The analysis is deterministic: re-running it reproduces them exactly.

## What the model does in the app

`GET /inventory/predict/{product_code}` and `GET /inventory/predictions` (`backend/routes/inventory.py`) predict **next-day units sold** for one product. The Inventory page shows the result, plus a suggested order quantity.

- **Model:** `DecisionTreeRegressor(max_depth=6, random_state=42)`. Each product gets its own tree.
- **Target:** `quantity_sold`, in units per product per day.
- **Features (6):** `weekday`, `month`, `is_weekend`, `promo`, `lag_1` (yesterday's units), `lag_7` (units seven days earlier).
- **Lags come from the product's own daily series.** The stored `lag_1`/`lag_7` columns aren't used: `lag_1` is incomplete and both are counted per branch (see `build_training_frame`). The first 7 days have no `lag_7` and are dropped, which leaves 358 rows per product.
- **In production, the tree trains on all of a product's history.** It is cached per product and retrained when that product's sales change.
- **The forecast row** is the next weekday, the same month, promo = 0, and the last observed `lag_1`/`lag_7`.
- **Suggested order** = `max(0, predicted_demand + reorder_level − current_stock)`.

## Evaluation method

- **Split:** chronological, per product. The first 80% of each product's 358 usable days train the tree (286 days, 8 Jan to 20 Oct 2023) and the **last 20% are held out** (72 days, 21 Oct to 31 Dec 2023). A random split would leak future days into training through the lag features.
- **Metrics:** MAE, RMSE and R² on the held-out days. They are reported per product, and **pooled** over all 720 held-out product-days.
- **Baselines.** The model is only useful if it beats something trivial, so there are three:
  - `lag_1`: tomorrow = today
  - `lag_7`: tomorrow = same day last week
  - `train mean`: tomorrow = the product's average training-period demand

## Results

### Pooled (720 held-out product-days)

| Predictor | MAE | RMSE | R² |
|---|---:|---:|---:|
| **Decision Tree** | **5.39** | **9.23** | **0.625** |
| lag_7 | 6.62 | 11.28 | 0.440 |
| train mean | 9.18 | 11.72 | 0.395 |
| lag_1 | 7.41 | 12.21 | 0.344 |

### Per product

| Product | DT MAE | DT RMSE | DT R² | lag_1 MAE | lag_7 MAE | train-mean MAE | Mean demand |
|---|---:|---:|---:|---:|---:|---:|---:|
| item_1 | 5.86 | 8.70 | 0.31 | 8.88 | 7.81 | 12.43 | 42.0 |
| item_2 | 6.11 | 10.58 | 0.19 | 10.33 | 7.83 | 11.01 | 36.9 |
| item_3 | 4.92 | 8.21 | 0.34 | 7.78 | 6.83 | 11.77 | 40.2 |
| item_4 | 8.27 | 15.59 | −0.45 | 10.25 | 8.33 | 11.88 | 40.6 |
| item_5 | 7.31 | 13.03 | −0.15 | 9.43 | 8.58 | 9.72 | 30.6 |
| item_6 | 5.78 | 8.01 | 0.47 | 8.54 | 7.99 | 12.75 | 40.3 |
| item_7 | 4.17 | 6.30 | −0.12 | 4.57 | 5.06 | 4.83 | 13.9 |
| item_8 | 3.73 | 5.78 | 0.09 | 5.36 | 4.50 | 5.71 | 17.1 |
| item_9 | 3.76 | 4.72 | −0.15 | 4.18 | 5.10 | 4.60 | 11.7 |
| item_10 | 3.99 | 5.03 | 0.14 | 4.75 | 4.12 | 7.08 | 20.2 |

### Mean feature importance (across the 10 trees)

| Feature | Importance |
|---|---:|
| month | 0.272 |
| lag_7 | 0.265 |
| promo | 0.182 |
| weekday | 0.164 |
| lag_1 | 0.111 |
| is_weekend | 0.007 |

## How to read these numbers

1. **The tree has the lowest MAE of the four predictors on all 10 products.** It beats `lag_1` and `train mean` on every product, and `lag_7` on every product, though only narrowly on `item_4` (8.27 vs 8.33) and `item_10` (3.99 vs 4.12).
2. **The pooled R² (0.625) overstates within-product skill.** Products sell at very different levels (about 12 to 42 units a day), and part of the pooled R² is just the model knowing each product's level. **Per product, R² is weak:** the median is 0.12, and 4 of 10 products are negative (`item_4` −0.45). A negative R² means that on those products' held-out days, the tree's squared errors are larger than predicting the test-period mean. Large RMSE relative to MAE (for example `item_4`, 15.6 vs 8.3) points to a few big misses on spike days.
3. **Typical error is about 4 to 8 units a day**, against mean demand of 12 to 42. That is accurate enough to drive a reorder suggestion, but not precise point forecasts.
4. Month and weekly seasonality (`lag_7`) carry most of the signal. Promotions matter. `is_weekend` adds almost nothing beyond `weekday`.

## Limitations

- **Synthetic data** (`dataset.md`): these results show the method works on this data, not that it would forecast real stores well.
- **One split, one year.** There is a single chronological 80/20 split per product: no rolling-origin cross-validation and no second year to test seasonality on. The tree's `month` feature sees each month only once in training, and November and December appear only in the test period, so the tree never trained on them.
- **No hyperparameter search.** `max_depth=6` is the production setting, evaluated as-is. A tuned tree or a different model might do better.
- **The forecast row assumes promo = 0** and the same month as the last observation.
- **Point forecasts only**, with no uncertainty interval.
