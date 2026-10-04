import { useEffect, useState } from "react";
import { fetchJson } from "./api";

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  green:       "#4a7a49",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  amber:       "#8a7020",
  amberBg:     "#fdf8e8",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const formatDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

const orderStatus = {
  created: { label: "Placed", bg: C.greenSubtle, color: C.green },
  awaiting_approval: { label: "Awaiting approval", bg: C.amberBg, color: C.amber },
};

function emailLink(business) {
  const subject = encodeURIComponent(`Supply enquiry from your Smart ERP supplier`);
  return `mailto:${business.email}?subject=${subject}`;
}

function BusinessDetailModal({ business, onClose }) {
  const isClient = Boolean(business.orders);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: "32px", width: 560, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text }}>{business.name}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{business.type} · {business.category} · {business.location}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textDim }}>×</button>
        </div>

        {business.description && (
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20, padding: "12px 14px", background: C.greenSubtle, borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>
            {business.description}
          </p>
        )}

        {isClient && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Orders Placed", value: business.ordersPlaced },
                { label: "Units Ordered", value: business.unitsOrdered.toLocaleString("en-IN") },
                { label: "Client Since", value: formatDate(business.firstOrder) },
              ].map((m) => (
                <div key={m.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Order History</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Order", "Product", "Qty", "Date", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 4px", fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {business.orders.map((o) => {
                  const st = orderStatus[o.status] || { label: o.status, bg: C.bg, color: C.textMuted };
                  return (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>#{o.id}</td>
                      <td style={{ padding: "8px 4px", fontFamily: "monospace", color: C.text }}>{o.product}</td>
                      <td style={{ padding: "8px 4px", color: C.text }}>{o.quantity}</td>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>{formatDate(o.date)}</td>
                      <td style={{ padding: "8px 4px" }}>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 20 }}>
              Orders are simulated by the business&apos;s procurement agent; no real order or payment is placed.
            </div>
          </>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Contact Details</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{business.email}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{business.phone}</div>
          {business.website && <div style={{ fontSize: 12, color: C.textMuted }}>{business.website}</div>}
        </div>

        <a href={emailLink(business)} style={{
          display: "block", textAlign: "center", padding: "10px", background: C.green, color: "#fff", borderRadius: 8,
          fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          Email {business.name}
        </a>
      </div>
    </div>
  );
}

function BusinessCard({ business, hovered, onHover, onOpen, children }) {
  return (
    <div
      onMouseEnter={() => onHover(business.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(business)}
      style={{
        background: C.card, borderRadius: 12, padding: "20px",
        border: hovered ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
        boxShadow: hovered ? "0 6px 24px rgba(74,122,73,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer", transition: "all .2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        position: "relative",
      }}>
      <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 90 }}>{business.name}</div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{business.category} · {business.location}</div>
      {children}
      <div style={{ marginTop: 10, fontSize: 11, color: C.green, fontWeight: 600 }}>Click to view details</div>
    </div>
  );
}

export default function SBusinessMarketplacePage({ user }) {
  const supplierId = user?.supplier_id;
  const [data, setData] = useState({ headerNote: "Loading businesses…", clients: [], otherBusinesses: [], categories: ["All"] });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supplierId) return undefined;
    let ignore = false;
    fetchJson(`/suppliers/${encodeURIComponent(supplierId)}/marketplace`)
      .then((response) => { if (!ignore) { setData(response); setError(""); } })
      .catch((err) => { if (!ignore) setError(err.message || "Could not load businesses."); });
    return () => { ignore = true; };
  }, [supplierId]);

  const q = search.toLowerCase();
  const filteredOthers = data.otherBusinesses.filter((b) =>
    (categoryFilter === "All" || b.category === categoryFilter) &&
    [b.name, b.category, b.location].some((v) => (v || "").toLowerCase().includes(q))
  );

  return (
    <div style={{ ...ibm }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
          <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Business Marketplace</h1>
        </div>
        <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
          {supplierId ? data.headerNote : "This account is not linked to a supplier ID"}
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fdf0f0", border: "1px solid #f0c8c0", borderRadius: 10, color: "#b8543f", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* My Clients */}
      <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>My Clients</div>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Approved businesses whose procurement agent has ordered from you</div>
      {data.clients.length === 0 ? (
        <div style={{ background: C.card, border: `1px dashed ${C.greenBorder}`, borderRadius: 12, padding: "24px", fontSize: 13, color: C.textMuted, marginBottom: 36 }}>
          No business has ordered from you yet. Orders appear here once a business approves a procurement recommendation that picks you as supplier.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 36 }}>
          {data.clients.map((b) => (
            <BusinessCard key={b.id} business={b} hovered={hovered === b.id} onHover={setHovered} onOpen={setSelected}>
              <div style={{ position: "absolute", top: 14, right: 14, background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>
                {b.ordersPlaced} order{b.ordersPlaced === 1 ? "" : "s"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, color: C.textDim }}>
                <div>Units: <span style={{ fontWeight: 600, color: C.text }}>{b.unitsOrdered.toLocaleString("en-IN")}</span></div>
                <div>Last order: <span style={{ fontWeight: 600, color: C.text }}>{formatDate(b.lastOrder)}</span></div>
                {b.ordersAwaiting > 0 && (
                  <div style={{ gridColumn: "1 / -1", color: C.amber, fontWeight: 600 }}>{b.ordersAwaiting} awaiting the business&apos;s approval</div>
                )}
              </div>
            </BusinessCard>
          ))}
        </div>
      )}

      {/* Other businesses */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Other Businesses on Smart ERP</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Approved businesses you don&apos;t supply yet · click to see contact details</div>
        </div>
        <input
          placeholder="Search businesses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px",
            fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
            width: 220, color: C.text, background: C.bg,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {data.categories.map((cat) => (
          <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
            border: `1px solid ${categoryFilter === cat ? C.green : C.border}`,
            background: categoryFilter === cat ? C.green : C.card,
            color: categoryFilter === cat ? "#fff" : C.textDim,
            fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
          }}>{cat}</button>
        ))}
      </div>
      {filteredOthers.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textDim, padding: "12px 0" }}>
          {data.otherBusinesses.length ? "No businesses match this search." : "No other approved businesses yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {filteredOthers.map((b) => (
            <BusinessCard key={b.id} business={b} hovered={hovered === b.id} onHover={setHovered} onOpen={setSelected}>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
                {b.description ? (b.description.length > 90 ? `${b.description.slice(0, 90)}…` : b.description) : b.type}
              </div>
            </BusinessCard>
          ))}
        </div>
      )}

      {selected && <BusinessDetailModal business={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
