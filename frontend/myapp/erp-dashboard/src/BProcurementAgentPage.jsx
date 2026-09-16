import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, fetchJson } from "./api";

// Same palette/typography as the rest of the Business dashboard (BInventoryPage.jsx, BusinessDashboard.jsx)
const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  green: "#4a7a49",
  greenLight: "#c8d8c7",
  greenMid: "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
  warnBg: "#fdf8e8",
  warn: "#8a7020",
  criticalBg: "#fdf0f0",
  critical: "#8a2020",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const statusStyle = {
  critical: { bg: C.criticalBg, color: C.critical, label: "Critical" },
  low: { bg: C.warnBg, color: C.warn, label: "Low" },
};

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.detail ? data.detail : `Request failed: ${path}`;
    throw new Error(message);
  }
  return data;
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

function Pill({ children, bg, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        color,
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    draft: { bg: C.greenSubtle, color: C.textMuted, label: "Draft" },
    awaiting_approval: { bg: C.warnBg, color: C.warn, label: "Awaiting Approval" },
    approved: { bg: C.greenSubtle, color: C.green, label: "Approved" },
    created: { bg: C.greenSubtle, color: C.green, label: "Simulated Order Created" },
    rejected: { bg: C.criticalBg, color: C.critical, label: "Rejected" },
    cancelled: { bg: "#f2f2f2", color: C.textDim, label: "Cancelled" },
    failed: { bg: C.criticalBg, color: C.critical, label: "Failed" },
  };
  const s = map[status] || { bg: "#f2f2f2", color: C.textDim, label: status };
  return <Pill bg={s.bg} color={s.color}>{s.label}</Pill>;
}

const btnPrimary = {
  background: C.green,
  color: "#fff",
  border: "none",
  borderRadius: 9,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const btnDanger = {
  background: "#fff",
  color: C.critical,
  border: `1px solid ${C.critical}`,
  borderRadius: 9,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const btnGhost = {
  background: C.greenSubtle,
  color: C.green,
  border: `1px solid ${C.greenBorder}`,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
};

export default function ProcurementAgentPage({ business, focusProductId, onFocusHandled }) {
  const [candidates, setCandidates] = useState([]);
  const [orders, setOrders] = useState([]);
  const [actions, setActions] = useState([]);
  const [draft, setDraft] = useState(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const identity = business?.email || business?.businessName || "business_user";

  const loadAll = useCallback(async () => {
    try {
      const [replenishment, orderList, actionList] = await Promise.all([
        fetchJson("/agent/replenishment"),
        fetchJson("/agent/orders"),
        fetchJson("/agent/actions?limit=25"),
      ]);
      setCandidates(replenishment.items || []);
      setOrders(orderList || []);
      setActions(actionList || []);
      setLoadError("");
    } catch {
      setCandidates([]);
      setOrders([]);
      setActions([]);
      setLoadError("Could not load procurement data from the backend.");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openRecommendation = useCallback(async (productId) => {
    setBusy(true);
    setActionError("");
    setConfirmation(null);
    try {
      const created = await postJson("/agent/drafts", { product_id: productId, requested_by: identity });
      setDraft(created);
      setEditedMessage(created.supplier_message || "");
      setRejectReason("");
    } catch (err) {
      setActionError(err.message);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }, [identity]);

  useEffect(() => {
    if (focusProductId) {
      openRecommendation(focusProductId);
      onFocusHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProductId]);

  async function handleApprove() {
    if (!draft) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await postJson(`/agent/drafts/${draft.id}/approve`, {
        approved_by: identity,
        edited_message: editedMessage,
      });
      setDraft(updated);
      setConfirmation({
        type: "approved",
        text: `Simulated internal purchase order #${updated.id} created for ${updated.quantity} units of ${updated.product_name} from ${updated.supplier_name}. This is an internal record only — no real order was placed with the supplier.`,
      });
      await loadAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!draft) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await postJson(`/agent/drafts/${draft.id}/reject`, {
        rejected_by: identity,
        reason: rejectReason || "Rejected by business user.",
      });
      setDraft(updated);
      setConfirmation({ type: "rejected", text: `Recommendation for ${updated.product_name} was rejected. No order was created.` });
      await loadAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isLocked = business && business.status !== "approved";

  return (
    <div style={{ ...ibm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>
              Procurement AI
            </h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
            Human-in-the-loop reorder assistant — every order is simulated and requires your approval
          </p>
        </div>
        <div
          style={{
            padding: "8px 16px",
            background: C.greenSubtle,
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 8,
            fontSize: 12,
            color: C.green,
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          Simulated Orders Only
        </div>
      </div>

      {isLocked && (
        <Card style={{ padding: "20px 24px", marginBottom: 24, border: `1px solid #ecdca2`, background: C.warnBg }}>
          <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.warn, marginBottom: 6 }}>
            Procurement is view-only until your business is approved
          </div>
          <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>
            You can review replenishment recommendations below, but approving a draft and creating a
            simulated order is restricted until an admin approves your business profile — the same rule
            that applies to the Supplier Marketplace.
          </div>
        </Card>
      )}

      {loadError && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {loadError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 20, alignItems: "start" }}>
        {/* Left: candidates needing replenishment */}
        <Card>
          <SectionTitle>Needs Replenishment ({candidates.length})</SectionTitle>
          {candidates.length === 0 ? (
            <div style={{ padding: "32px 22px", color: C.textDim, fontSize: 13, textAlign: "center" }}>
              No products are currently flagged for replenishment. Every tracked product is above its
              reorder level.
            </div>
          ) : (
            <div>
              {candidates.map((item) => {
                const style = statusStyle[item.stock_status] || statusStyle.low;
                const isActive = draft && draft.product_id === item.product_id;
                return (
                  <div
                    key={item.product_id}
                    style={{
                      padding: "16px 22px",
                      borderBottom: `1px solid ${C.border}`,
                      background: isActive ? C.greenSubtle : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => openRecommendation(item.product_id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: C.text }}>{item.product_name}</span>
                      <Pill bg={style.bg} color={style.color}>{style.label}</Pill>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                      Stock {item.current_stock} / reorder level {item.reorder_level} · recommended order{" "}
                      <strong>{item.recommended_quantity}</strong> units
                    </div>
                    <button style={btnGhost} onClick={(e) => { e.stopPropagation(); openRecommendation(item.product_id); }}>
                      Review Recommendation →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: recommendation detail / approval panel */}
        <Card>
          <SectionTitle>Recommendation Detail</SectionTitle>
          {!draft && (
            <div style={{ padding: "32px 22px", color: C.textDim, fontSize: 13, textAlign: "center" }}>
              Select a product on the left to review its reorder recommendation.
            </div>
          )}

          {draft && (
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ ...syne, fontSize: 17, fontWeight: 700, color: C.text }}>{draft.product_name}</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>Draft #{draft.id}</div>
                </div>
                <StatusPill status={draft.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Current Stock", value: draft.current_stock },
                  { label: "Reorder Level", value: draft.reorder_level },
                  { label: "Recommended Qty", value: draft.recommended_quantity },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: C.greenSubtle, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.greenBorder}` }}>
                    <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ ...syne, fontSize: 18, fontWeight: 700, color: C.text }}>{stat.value ?? "—"}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  Why this recommendation
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: C.bg, borderRadius: 8, padding: "12px 14px" }}>
                  {draft.explanation}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  Recommended Supplier
                </div>
                {draft.supplier_name ? (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: C.text, marginBottom: 4 }}>{draft.supplier_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      Weighted score {draft.supplier_score ? Math.round(draft.supplier_score * 10) / 10 : "—"}/100 · Rank #{draft.supplier_rank ?? "—"}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: C.textDim }}>No supplier could be identified for this product.</div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  Draft Message to Supplier (editable before approval)
                </div>
                <textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  disabled={draft.status !== "awaiting_approval" || isLocked}
                  rows={6}
                  style={{
                    width: "100%",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12.5,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    color: C.text,
                    resize: "vertical",
                    boxSizing: "border-box",
                    background: draft.status !== "awaiting_approval" ? C.bg : "#fff",
                  }}
                />
              </div>

              {draft.status === "awaiting_approval" && (
                <>
                  <input
                    placeholder="Reason if rejecting (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{
                      width: "100%",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "9px 12px",
                      fontSize: 12.5,
                      marginBottom: 12,
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={btnPrimary} disabled={busy || isLocked} onClick={handleApprove}>
                      {isLocked ? "Approval locked" : busy ? "Working…" : "Approve & Create Simulated Order"}
                    </button>
                    <button style={btnDanger} disabled={busy || isLocked} onClick={handleReject}>
                      Reject
                    </button>
                  </div>
                </>
              )}

              {confirmation && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    background: confirmation.type === "approved" ? C.greenSubtle : C.criticalBg,
                    color: confirmation.type === "approved" ? C.green : C.critical,
                    border: `1px solid ${confirmation.type === "approved" ? C.greenBorder : "#ecc"}`,
                  }}
                >
                  {confirmation.text}
                </div>
              )}

              {actionError && (
                <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, background: C.criticalBg, color: C.critical }}>
                  {actionError}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <Card>
          <SectionTitle>Simulated Purchase Orders ({orders.length})</SectionTitle>
          {orders.length === 0 ? (
            <div style={{ padding: "24px 22px", color: C.textDim, fontSize: 13, textAlign: "center" }}>
              No simulated orders have been created yet.
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {orders.map((order) => (
                <div key={order.id} style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: C.text }}>
                      #{order.id} · {order.product_name} · {order.quantity} units
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textDim }}>Supplier: {order.supplier_name || "—"}</div>
                  </div>
                  <StatusPill status={order.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Agent Action History</SectionTitle>
          {actions.length === 0 ? (
            <div style={{ padding: "24px 22px", color: C.textDim, fontSize: 13, textAlign: "center" }}>
              No agent activity recorded yet.
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {actions.map((action) => (
                <div key={action.id} style={{ padding: "10px 22px", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <div style={{ color: C.textDim, fontSize: 10.5, marginBottom: 2 }}>
                    {action.created_at ? new Date(action.created_at).toLocaleString() : ""} · {action.action_type}
                  </div>
                  <div style={{ color: C.text }}>{action.message}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
