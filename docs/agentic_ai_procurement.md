# Agentic AI Procurement Assistant

Human-in-the-loop reorder workflow: detect low stock → analyze → recommend a
supplier → draft a message → **wait for explicit human approval** → create a
simulated/internal purchase order → log every step.

This feature **never places a real external order**, **never sends a real
message**, and **never moves money**. Every purchase order it creates is
marked `is_simulated = true` and exists only inside this application's
database.

## Workflow

```
Low-stock product (Product.supplier_stock <= reorder_level, same rule the
Inventory page already uses)
        |
        v
services/replenishment.py  -- deterministic reorder-quantity formula
        |
        v
services/supplier_selection.py  -- reuses the existing weighted supplier score
        |
        v
services/gemini_helper.py  -- natural-language explanation + drafted message
        |  (Gemini text only -- never touches the database)
        v
services/agent_orchestrator.py  -- persists a PurchaseOrder(status="awaiting_approval")
        |  + logs every step to AgentAction
        v
   ================== HUMAN REVIEWS IN THE UI ==================
        |
        +---- Approve --> PurchaseOrder.status = "approved" -> "created"
        |                 (simulated order now exists; logged)
        |
        +---- Reject  --> PurchaseOrder.status = "rejected" (no order created)
```

The agent can never approve its own recommendation: `approve_draft()` and
`reject_draft()` are the only two functions that can move a `PurchaseOrder`
out of `awaiting_approval`, and both require the caller (the API layer) to
have received an explicit approve/reject request — there is no code path
that transitions a draft to `approved` on its own.

## Architecture

| Layer | File | Responsibility |
|---|---|---|
| Reorder math | `backend/services/replenishment.py` | Deterministic reorder-quantity formula, low-stock detection. No ML, no Gemini. |
| Supplier ranking | `backend/services/supplier_selection.py` | Reuses the existing weighted-score fields already computed by `csv_loader.py` — does not recompute scoring. |
| Gemini | `backend/services/gemini_helper.py` | Text-only: explanation + drafted message. Always has a deterministic fallback. |
| Orchestration | `backend/services/agent_orchestrator.py` | The one place that coordinates the steps above and enforces the approval state machine. |
| API | `backend/routes/agent.py` | Thin HTTP layer over the orchestrator — no business logic lives here. |
| Data | `backend/models.py` — `PurchaseOrder`, `AgentAction` | See "Why no separate Approval table" below. |
| Frontend | `frontend/myapp/erp-dashboard/src/BProcurementAgentPage.jsx` | The "Procurement AI" tab in the Business dashboard. |

Nothing here recomputes the Decision Tree, the Isolation Forest, or the
supplier weighted score — it reuses `Product.supplier_stock`/`reorder_level`
(the same fields `business_pages.inventory_overview` already reads) and the
`Supplier.weighted_score`/`rank` columns the existing CSV import pipeline
already populates.

## Reorder-quantity formula

A standard reorder-point / safety-stock model, fully deterministic (no ML,
no LLM):

```
coverage_days   = supplier_lead_time_days + SAFETY_BUFFER_DAYS   (default lead time: 7 days, buffer: 3 days)
target_stock    = avg_daily_sales * coverage_days
recommended_qty = max(0, ceil(target_stock - current_stock))
```

`avg_daily_sales` is computed from the last 30 days of recorded sales for
that product (matched by `product_code`, the same reliably-populated field
the rest of the app uses — see "Known limitations"). If fewer than 5 sales
records are available, the formula falls back to a simple top-up instead of
inventing a trend:

```
recommended_qty = max(0, reorder_level - current_stock)
```

The reasoning behind every number is returned as a plain-English list
(`PurchaseOrder.reasoning`, JSON-encoded) so the business owner sees exactly
what the agent used to reach its recommendation — never just a number.

## Why no separate `Approval` table

The task list asked us to justify this rather than default to adding one.
`PurchaseOrder.status` already carries the full lifecycle
(`draft → awaiting_approval → approved → created`, or `→ rejected`), and
every transition — including the human's decision — is written to
`AgentAction` (`action_type="approved"` or `"rejected"`, with `actor` and a
timestamp). A separate `Approval` table would only earn its keep if a single
draft could receive multiple, possibly conflicting approval requests (e.g.
multi-approver sign-off) — this MVP has exactly one decision per draft, so
that join table would just be a second place the same fact could get out of
sync with `PurchaseOrder.status`. If a real multi-approver workflow becomes
a requirement later, that is the point to add it.

## API endpoints

All under `/agent`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/agent/replenishment` | List every product currently flagged low/critical, with its recommendation. |
| GET | `/agent/replenishment/{product_id}` | Deterministic analysis for one product. |
| GET | `/agent/suppliers/{product_id}` | Ranked supplier recommendation for one product. |
| POST | `/agent/drafts` | Run the full pipeline and persist a draft (`awaiting_approval`). Body: `{product_id, requested_by?}`. |
| GET | `/agent/drafts` | List drafts/orders, optional `?status=` filter. |
| GET | `/agent/drafts/{id}` | One draft/order. |
| POST | `/agent/drafts/{id}/approve` | The only way a simulated order gets created. Body: `{approved_by?, edited_message?}`. |
| POST | `/agent/drafts/{id}/reject` | Body: `{rejected_by?, reason?}`. |
| GET | `/agent/orders` | Purchase orders that reached `status="created"`. |
| GET | `/agent/actions` | The audit log, optional `?purchase_order_id=` filter. |

Every state-changing endpoint validates the current status server-side
before acting (`services/agent_orchestrator.VALID_TRANSITIONS`) and returns
HTTP 409 with a specific message if the requested transition isn't legal —
the frontend cannot force an invalid transition by calling the API directly.

## Approval process (human-in-the-loop, enforced)

1. Business owner opens **Procurement AI**, sees products flagged for
   replenishment (same low-stock rule as the Inventory page).
2. Clicking a product calls `POST /agent/drafts`, which runs the full
   analysis + supplier selection + message drafting pipeline and persists
   the result as `awaiting_approval` — nothing has been "ordered" yet.
3. The owner reviews the numbers, the explanation, the supplier, and can
   **edit the drafted message** before deciding.
4. **Approve** → `POST /agent/drafts/{id}/approve` → the order becomes
   `created` (simulated) and is logged.
   **Reject** → `POST /agent/drafts/{id}/reject` → nothing is created; the
   rejection and its reason are logged.
5. The result and the full history are visible immediately in the same page
   (Simulated Purchase Orders + Agent Action History), both reading live
   from the backend.

## Known limitations

- **No enforced authentication yet.** `requested_by`/`approved_by`/
  `rejected_by` are free-text strings the frontend sends — there is no JWT
  or session to verify them against (the rest of the application has this
  same gap; see the separate auth backlog). Anyone who can reach the API can
  approve a draft under any name. This is a real limitation, not hidden: the
  UI's "Procurement is view-only until approved" banner is a client-side
  convenience only, not a server-side enforcement, exactly like the existing
  Supplier Marketplace lock it mirrors.
- **No multi-tenancy.** `purchase_orders`/`agent_actions` have no
  `business_id`, matching every other table in the schema today — this
  feature will need scoping in the same pass that adds multi-tenancy
  elsewhere.
- **One supplier per product.** The schema links each `Product` to at most
  one `Supplier`. The agent recommends that assigned supplier (resolved via
  `supplier_code`, since `Product.supplier_id` is frequently `NULL` in the
  seeded data — the same legacy dual-column issue documented for
  `Sale.product_id`/`product_code`) and surfaces the next-best-ranked
  suppliers as alternatives, rather than a true per-product multi-bidder
  catalog.
- **Approve and "create order" happen in one step.** Since there is no real
  external purchasing system to wait on, approval immediately finalizes the
  simulated order. If a real ordering integration is ever added, that would
  become its own state and endpoint.
- **No cancel/withdraw endpoint yet.** The state machine allows
  `awaiting_approval → cancelled`, but no API route exposes it — a business
  owner can only approve or reject a draft today, not withdraw it silently.
- **Gemini model list.** `gemini_helper.py` tries `gemini-flash-latest`
  first; the model name `routes/chat.py`'s cascade starts with
  (`gemini-2.0-flash`) returned `404 Not Found` against this Gemini API key
  during testing — the chatbot has the same latent issue and would benefit
  from the same fix, though that file was left untouched (out of scope for
  this feature).
- **Pre-existing DB drift discovered during testing:** `products.category`
  and `products.price` are `NOT NULL` at the database level even though
  `models.py` declares them nullable — unrelated to this feature, surfaced
  only because a test inserted a minimal test row.
