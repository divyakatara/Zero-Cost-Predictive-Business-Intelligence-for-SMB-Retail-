import { useEffect, useRef, useState } from "react";

// Bell + panel for the business dashboard header. It does not fetch anything:
// the dashboard already loads the stock/supplier alerts (/dashboard/overview)
// and the anomaly count (/anomaly/anomalies), so those are shown here instead
// of repeating them as a card. Read state lives in this browser (localStorage),
// per business, because the backend has no notification table.

const C = {
  card: "#ffffff",
  green: "#4a7a49",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
};

const SEVERITY_DOT = { high: "#c83030", medium: "#c8a030", info: "#7aaa79" };
const AREA_LABEL = { Inventory: "Inventory", "Supplier Marketplace": "Suppliers", Alerts: "Alerts" };
const SEVERITY_RANK = { high: 0, medium: 1, info: 2 };

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

function loadReadIds(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function buildNotifications(alerts, anomalies) {
  const items = (alerts || []).map((alert) => ({
    id: alert.title,
    severity: alert.severity === "high" ? "high" : "medium",
    title: alert.title,
    detail: alert.detail,
    target: alert.target,
  }));
  if (anomalies?.total > 0) {
    items.push({
      // The count is part of the id, so a changed count shows up as unread again.
      id: `anomalies:${anomalies.total}`,
      severity: "medium",
      title: "Unusual transactions detected",
      detail: `${anomalies.total} of ${anomalies.rows.toLocaleString("en-IN")} transactions were flagged by the anomaly model.`,
      target: "Alerts",
    });
  }
  return items;
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

const textButton = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: C.green,
  fontSize: 12,
  fontWeight: 600,
  ...ibm,
};

export default function NotificationBell({ alerts, anomalies, loading, error, storageId, onNavigate }) {
  const storageKey = `smarterp_read_notifications_${storageId}`;
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => loadReadIds(storageKey));
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const notifications = buildNotifications(alerts, anomalies);
  const isRead = (item) => readIds.includes(item.id);
  const unreadCount = notifications.filter((item) => !isRead(item)).length;
  // Unread first, then most severe first; the sort is stable so the backend order is kept otherwise.
  const ordered = [...notifications].sort(
    (a, b) => Number(isRead(a)) - Number(isRead(b)) || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  // Only ids that are still current are kept, so the saved list cannot grow forever.
  function saveRead(ids) {
    const current = new Set(notifications.map((item) => item.id));
    const next = [...new Set(ids)].filter((id) => current.has(id));
    setReadIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage unavailable: read state then lasts for this page view only */
    }
  }

  function openNotification(item) {
    saveRead([...readIds, item.id]);
    setOpen(false);
    onNavigate(item.target);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...ibm }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          position: "relative",
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.card,
          color: C.textMuted,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              boxSizing: "border-box",
              borderRadius: 8,
              background: SEVERITY_DOT.high,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: 46,
            right: 0,
            zIndex: 30,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text }}>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" style={textButton} onClick={() => saveRead(notifications.map((item) => item.id))}>
                Mark all as read
              </button>
            )}
          </div>

          {ordered.length > 0 && (loading || error) && (
            // The anomaly count can arrive while the stock/supplier request is still pending or has failed.
            <div style={{ padding: "9px 18px", fontSize: 12, color: C.textMuted, background: "#faf8f4", borderBottom: `1px solid ${C.border}` }}>
              {loading ? "Still loading stock and supplier alerts..." : "Stock and supplier alerts could not be loaded."}
            </div>
          )}

          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {ordered.length === 0 && (
              <div style={{ padding: "28px 18px", textAlign: "center", fontSize: 13, color: C.textMuted }}>
                {loading && "Loading notifications..."}
                {!loading && error && "Could not load notifications from the backend."}
                {!loading && !error && (
                  <>
                    <div style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>You are all caught up</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>No stock, supplier or anomaly alerts right now.</div>
                  </>
                )}
              </div>
            )}

            {ordered.map((item, index) => {
              const read = isRead(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 18px",
                    background: read ? C.card : "#faf8f4",
                    border: "none",
                    borderBottom: index === ordered.length - 1 ? "none" : `1px solid ${C.border}`,
                    cursor: "pointer",
                    ...ibm,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_DOT[item.severity], flexShrink: 0, marginTop: 5 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: read ? 500 : 600, color: read ? C.textMuted : C.text }}>{item.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: C.textDim, marginTop: 2 }}>{item.detail}</span>
                    <span style={{ display: "block", fontSize: 11, color: C.textDim, marginTop: 4 }}>
                      {AREA_LABEL[item.target] || item.target} · {read ? "Read" : "Unread"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: "11px 18px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
            <button
              type="button"
              style={textButton}
              onClick={() => {
                setOpen(false);
                onNavigate("Alerts");
              }}
            >
              View all alerts →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
