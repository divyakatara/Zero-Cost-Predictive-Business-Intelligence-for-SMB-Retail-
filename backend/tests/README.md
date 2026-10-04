# Backend tests

```bash
cd backend
pip install -r requirements.txt
python -m pytest -q
```

No database or `.env` is needed. Every test gets its own in-memory SQLite database (`conftest.py`), and `DATABASE_URL` defaults to `sqlite://` when unset. A few tests that need real concurrency use a temporary file-backed SQLite database instead. Gemini is never called: tests either stub `gemini_helper.generate_text` or clear `GEMINI_API_KEY` to get the deterministic fallback.

The ML tests read the seeded demo workbook in `backend/data/`. Models are trained into `tmp_path`, so the committed Isolation Forest file (`ml/cache/isolation_forest_transactions.joblib`) is never rewritten.

## What is covered

| Area | Files |
|---|---|
| **Cross-business isolation:** no endpoint returns or changes another business's rows; import/clear/load-demo/history are scoped; chatbot figures per business | `test_business_isolation.py` |
| Login, tokens, protected routes, password change | `test_auth.py` |
| Business registration and resubmission | `test_business_registration.py` |
| Admin approve / reject / revoke | `test_business_admin_review.py` |
| GST certificate upload and access control | `test_gst_certificate.py` |
| Secrets not in source; distinct seeded supplier passwords | `test_security_config.py` |
| Chatbot role taken from the token; live fallback figures | `test_chat.py` |
| Procurement agent: human approval, cancel, terminal states | `test_agent_approval.py` |
| One awaiting draft per product, including a real race | `test_draft_uniqueness.py` |
| Reorder analysis | `test_reorder_analysis.py` |
| Supplier ranking shared by marketplace and agent | `test_supplier_consistency.py`, `test_supplier_scoping.py` |
| Supplier portal data scoped to the supplier's own products | `test_supplier_data_pages.py` |
| Supplier anomalies | `test_supplier_anomalies.py` |
| ML: Isolation Forest 73/3,650 regression, Decision Tree shape | `test_ml.py` |
| ML: one identifier (`product_code`) across endpoints | `test_ml_identifiers.py` |
| Decision Tree lag features and per-product model cache | `test_forecast_lags.py`, `test_demand_model_cache.py` |

Endpoints that use Postgres-only SQL (`date_trunc`) aren't exercised against SQLite. Those parts are checked against the real database by hand, as described in each PR.
