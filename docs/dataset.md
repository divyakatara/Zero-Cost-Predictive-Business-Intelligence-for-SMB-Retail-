# Dataset

> **This is synthetic demo data, not real business evidence.** The workbook's own *Data Notes* sheet says: *"This is synthetic/demo data intended for a capstone prototype and evaluation."* Any result computed on it shows that the pipeline works. It does not show anything about real retail demand, real suppliers or real fraud.

All figures below come from `analysis/research_metrics.py` (output in `analysis/results.json`).

## Source

One Excel workbook: `backend/data/Capstone_ERP_Cleaned_Final (1).xlsx`. The backend loads it into PostgreSQL at startup (`csv_loader.py`). `backend/data/inventory_seed.csv.xlsx` seeds the separate `inventory` table.

| Sheet | Rows | Used for |
|---|---:|---|
| `Transactions` | 3,650 | Isolation Forest, Decision Tree evaluation |
| `retail_sales` | 3,650 | `retail_sales` table: dashboards, sales and analytics pages, Decision Tree in the app |
| `products` | 10 | `products` table |
| `suppliers` | 5 | `suppliers` table and weighted supplier scoring |
| `supplier_stock` | 20 | Stock levels, reorder levels, risk score per product |
| `inventory sheet` | 20 | Per-branch stock snapshot |
| `branches` | 2 | Branch names |
| `Data Notes` | 11 | How the data was cleaned (summarised below) |

## Shape

- **Period:** 1 Jan 2023 to 31 Dec 2023, 365 distinct days.
- **Granularity:** exactly **one row per product per day**. 10 products × 365 days = 3,650 rows. `sale_date + product_id + branch_id` is unique.
- **Branches:** `store_1` (RR branch) has 2,920 rows and `store_2` (JP Nagar branch) has 730. Both are in Bengaluru. Each product-day belongs to one branch, so the branches are not two parallel series.
- **Products:** `item_1` to `item_10`, across four categories (Grocery, Electronics, Fashion, Stationery).
- **Suppliers:** 5 in the master sheet, but **only `supplier_1`, `supplier_2` and `supplier_3` supply products**. `supplier_4` and `supplier_5` have no products, which matters for supplier scoring (see `supplier_scoring.md`).
- **Demand (`quantity_sold` per product-day):** mean 34.5, standard deviation 18.8, median 32, minimum 2, maximum 203.
- **Promotions:** 10.25% of rows have `promo = 1`.
- **Totals:** revenue ₹66,25,422.62 and profit ₹19,87,374.48.

## Columns (`Transactions`)

`transaction_id`, `sale_date`, `product_id`, `branch_id`, `quantity_sold`, `sales_amount`, `current_stock`, `reorder_level`, `supplier_id`, `price`, `promo`, `weekday`, `month`, `cost_price`, `total_cost`, `profit`, `lag_7`, `is_weekend`

## How it was generated and cleaned (from *Data Notes*)

- Financials are **derived**: `sales_amount`, `total_cost` and `profit` are recalculated from quantity, price and cost price.
- Calendar fields (`weekday`, `month`, `is_weekend`) are derived from `sale_date`.
- `lag_7` is recalculated per product and branch, and `lag_1` is refreshed in `retail_sales`. The app's Decision Tree **does not use these stored lags**. It rebuilds lag features from each product's own daily series (see `decision_tree_evaluation.md`).
- Product master prices, costs and supplier mappings are aligned with the transactions.
- The inventory snapshot is aligned with the latest transaction state.
- Supplier stock status, utilisation and risk vary with stock coverage.
- Suppliers have unique dummy phone numbers, plus delivery, quality and reliability fields added for scoring.

## What the data can and cannot support

| Can support | Cannot support |
|---|---|
| Showing that ingestion, dashboards, forecasting, anomaly scoring and supplier ranking run end to end | Any claim about real retail demand patterns |
| Comparing the forecasting model with naive baselines **on this data** | Generalising forecast accuracy to real stores |
| Showing how the supplier ranking reacts to weight choices | Claims about real supplier quality or real procurement outcomes |
| Showing what the Isolation Forest flags and why | Any precision or recall for fraud or error detection: there are no labelled anomalies |

## Known quirks

- Two stock sources disagree. `products.supplier_stock` comes from `supplier_stock`, and the separate `inventory` table comes from `inventory_seed.csv.xlsx`. The app uses `products.supplier_stock` everywhere.
- `supplier_4` and `supplier_5` have no products, so their average cost is **imputed with the median** during scoring.
