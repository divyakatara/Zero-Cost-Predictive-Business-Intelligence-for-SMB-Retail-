# Supplier weighted scoring: formula, rationale and sensitivity

All numbers come from `analysis/research_metrics.py` → `analysis/results.json`.

## Formula (as implemented)

`backend/csv_loader.py` computes the score once, when the workbook is loaded. It is stored in `suppliers.weighted_score` and `suppliers.rank`. The Supplier Marketplace and the procurement agent both read it through `services/supplier_selection.ranked_suppliers`.

1. **Four criteria per supplier:**

   | Criterion | Source | Direction |
   |---|---|---|
   | Cost | average `cost_price` of the products the supplier supplies | lower is better |
   | Quality | `quality_score` | higher is better |
   | Delivery | `lead_time_days` | lower is better |
   | Reliability | `reliability_score` | higher is better |

2. **Min–max normalise each criterion to 0–100** across the 5 suppliers, inverted for "lower is better". The best supplier on a criterion gets 100 and the worst gets 0.
3. **Weighted sum:**

   `weighted_score = 0.30·cost + 0.30·quality + 0.20·delivery + 0.20·reliability`

4. **Rank** by `weighted_score`, highest first. Ties share the best rank.

## Components and result

| Supplier | Avg cost (₹) | Quality | Lead time (days) | Reliability | Cost score | Quality score | Delivery score | Reliability score | **Weighted** | **Rank** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| supplier_1 | 34.43 | 92 | 3 | 94 | 52.9 | 83.3 | 100 | 100 | **80.9** | 1 |
| supplier_4 | 34.43\* | 94 | 4 | 93 | 52.9 | 100 | 75 | 90 | **78.9** | 2 |
| supplier_2 | 29.56 | 88 | 5 | 90 | 100 | 50 | 50 | 60 | **67.0** | 3 |
| supplier_5 | 34.43\* | 86 | 6 | 87 | 52.9 | 33.3 | 25 | 30 | **36.9** | 4 |
| supplier_3 | 39.91 | 82 | 7 | 84 | 0 | 0 | 0 | 0 | **0.0** | 5 |

\* **Imputed.** `supplier_4` and `supplier_5` supply no products, so they have no average cost. The pipeline fills it with the median (₹34.43), which happens to equal `supplier_1`'s real value. On cost, those two suppliers are therefore placed at the middle by assumption, not by evidence.

The recomputed scores match the values stored in the database exactly.

## Why 30 / 30 / 20 / 20

The split is a **design choice made for this prototype**. It is not derived from data or from a survey of buyers. Its reasoning:

- **Cost and quality get the most weight.** For a small retailer with thin margins, unit cost directly drives profit, and quality drives returns and customer retention. Price and quality are also among the criteria discussed most often in the supplier-selection literature. Weber, Current & Benton's review (1991) found net price, delivery and quality the most frequently cited criteria.
- **Delivery and reliability get the remaining 40%.** They matter for avoiding stock-outs, but in this app a separate component handles delivery timing: the reorder logic adds the supplier's lead time to its coverage window (`services/replenishment.py`).

**A caveat for the paper:** the literature doesn't uniformly support putting cost above delivery. Dickson's classic survey (1966) ranked quality first and delivery second, with price lower. The sensitivity analysis below shows how much the choice matters.

*References (please check against the originals before citing):*
- *Dickson, G. W. (1966). An analysis of vendor selection systems and decisions. Journal of Purchasing, 2(1), 5–17.*
- *Weber, C. A., Current, J. R., & Benton, W. C. (1991). Vendor selection criteria and methods. European Journal of Operational Research, 50(1), 2–18.*

## Sensitivity to the weights (#45)

The same normalised components were re-scored under four alternative weight sets. Agreement with the production ranking is measured with Kendall's τ (1 = identical order, −1 = reversed).

| Weights (cost/quality/delivery/reliability) | Ranking (best → worst) | Scores | τ vs production |
|---|---|---|---:|
| **Production 30/30/20/20** | s1, s4, s2, s5, s3 | 80.9, 78.9, 67.0, 36.9, 0.0 | 1.0 |
| Equal 25/25/25/25 | s1, s4, s2, s5, s3 | 84.1, 79.5, 65.0, 35.3, 0.0 | 1.0 |
| Delivery-heavy 20/20/30/30 | s1, s4, s2, s5, s3 | 87.3, 80.1, 63.0, 33.8, 0.0 | 1.0 |
| Cost-heavy 50/20/15/15 | **s2**, s1, s4, s5, s3 | 76.5, 73.1, 71.2, 41.4, 0.0 | 0.6 |
| Quality-heavy 20/50/15/15 | **s4**, s1, s2, s5, s3 | 85.3, 82.3, 61.5, 35.5, 0.0 | 0.8 |

### Findings

- **The ranking is stable for moderate changes.** Equal weights and delivery-heavy weights reproduce the production order exactly.
- **Only the top three swap, and only under strong emphasis.** With 50% on cost, `supplier_2` (the only clearly cheaper supplier) moves to first. With 50% on quality, `supplier_4` moves to first.
- **The bottom two never move.** `supplier_5` is 4th and `supplier_3` is last (worst on every criterion) under every weight set tried.
- **`supplier_1` vs `supplier_4` is close** (80.9 vs 78.9), and its outcome partly depends on `supplier_4`'s **imputed** cost. With a real cost figure for `supplier_4`, the top spot could change under the production weights too.

## Limitations

- **Five suppliers, synthetic values** (`dataset.md`). With n = 5, min–max normalisation is sensitive to the extremes. `supplier_3` scores exactly 0 because it is the worst on every criterion, not because it is worthless.
- **Imputed cost** for the two suppliers without products.
- **Static.** Scores are computed when data is loaded, not updated from actual purchase outcomes.
- **One supplier per product.** The schema links each product to one supplier, so the ranking is advisory: the procurement agent recommends the product's own supplier when it is viable, and shows the ranked alternatives.
