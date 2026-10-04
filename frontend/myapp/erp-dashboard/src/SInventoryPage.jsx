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
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const FILTERS = ["All", "Critical", "Low", "OK"];

const statusMap = {
  ok:       { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a", label: "In Stock" },
  low:      { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030", label: "Low"      },
  critical: { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030", label: "Critical" },
};

// Retailer stock of the products this supplier provides. A low or critical
// row is a likely incoming order for the supplier.
export default function SupplierInventoryPage({ user }) {
  const supplierId = user?.supplier_id;
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ headerNote: "Loading your products…", items: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplierId) return undefined;
    let ignore = false;
    fetchJson(`/suppliers/${encodeURIComponent(supplierId)}/inventory`)
      .then((response) => { if (!ignore) { setData(response); setError(""); } })
      .catch((err) => { if (!ignore) setError(err.message || "Could not load inventory."); });
    return () => { ignore = true; };
  }, [supplierId]);

  const items = data.items;
  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q);
    const matchFilter = activeFilter === "All" || i.status === activeFilter.toLowerCase();
    return matchSearch && matchFilter;
  });

  const counts = {
    total: items.length,
    ok: items.filter((i) => i.status === "ok").length,
    low: items.filter((i) => i.status === "low").length,
    critical: items.filter((i) => i.status === "critical").length,
  };
  const opportunities = items
    .filter((i) => i.status !== "ok")
    .sort((a, b) => a.qty / Math.max(a.reorder, 1) - b.qty / Math.max(b.reorder, 1));

  return (
    <div style={{ ...ibm }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
          <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Inventory</h1>
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

      {/* Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Products Supplied", value: counts.total,    sub: "Linked to your supplier ID", accent: true },
          { label: "In Stock",          value: counts.ok,       sub: "Above reorder threshold" },
          { label: "Low Stock",         value: counts.low,      sub: "Within 25% of reorder level" },
          { label: "Critical",          value: counts.critical, sub: "At or below reorder level" },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.accent ? C.green : C.card, borderRadius: 10,
            padding: "16px", border: s.accent ? "none" : `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 10, color: s.accent ? "rgba(255,255,255,0.7)" : C.textDim, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 700, color: s.accent ? "#fff" : C.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.accent ? "rgba(255,255,255,0.6)" : C.textDim, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${C.border}`, background: C.greenSubtle }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text }}>Retailer Stock of Your Products</div>
            <div style={{ display: "flex", gap: 4 }}>
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${activeFilter === f ? C.green : "transparent"}`,
                  background: activeFilter === f ? C.green : "transparent",
                  color: activeFilter === f ? "#fff" : C.textDim,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
                }}>{f}</button>
              ))}
            </div>
          </div>
          <input
            placeholder="Search product or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px",
              fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
              width: 210, color: C.text, background: C.bg,
            }}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Product", "Category", "Retailer Stock", "Reorder Level", "Branch", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 18px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "28px 18px", textAlign: "center", fontSize: 13, color: C.textDim }}>
                  {items.length ? "No products match this filter." : "No products are linked to your supplier ID yet."}
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const s = statusMap[item.status] || statusMap.ok;
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "13px 18px", fontWeight: 600, fontSize: 13, color: C.text, fontFamily: "monospace" }}>{item.name}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ background: C.greenSubtle, color: C.textMuted, borderRadius: 4, padding: "2px 8px", fontSize: 11, border: `1px solid ${C.greenBorder}` }}>{item.category}</span>
                  </td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontWeight: 600, fontSize: 13, color: C.text }}>{item.qty.toLocaleString("en-IN")} {item.unit}</td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontSize: 13, color: C.textMuted }}>{item.reorder.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: C.textMuted }}>{item.updated}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock opportunities */}
      <div style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Restock Opportunities</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Your products that retailers are running low on — most urgent first</div>
        {opportunities.length === 0 && (
          <div style={{ fontSize: 13, color: C.textMuted, padding: "10px 0" }}>Retailer stock of all your products is healthy.</div>
        )}
        {opportunities.map((item) => {
          const s = statusMap[item.status];
          const gap = item.reorder - item.qty;
          return (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                  {item.qty} in stock · reorder level {item.reorder}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{s.label}</span>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                  {gap > 0 ? `${gap} units below reorder level` : `${-gap} units above reorder level`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
