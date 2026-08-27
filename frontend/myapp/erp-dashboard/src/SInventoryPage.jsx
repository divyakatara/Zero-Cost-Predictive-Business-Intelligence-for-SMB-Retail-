import { useEffect, useState } from "react";
import { fetchJson } from "./api";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  ok:     { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a" },
  low:    { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030" },
  ct:     { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030" },
  ov:     { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const risks = [
  { icon: "◬", name: "Supplier A", desc: "No data yet", lvl: "low" },
  { icon: "◬", name: "Supplier B", desc: "No data yet", lvl: "low" },
  { icon: "◬", name: "Supplier C", desc: "No data yet", lvl: "low" },
];

const reorders = [
  { p: "Item 1", s: "Supplier A", q: 0, u: "soon" },
  { p: "Item 2", s: "Supplier B", q: 0, u: "soon" },
  { p: "Item 3", s: "Supplier C", q: 0, u: "soon" },
];

const FILTERS = ["All", "Critical", "Low", "OK", "Overstock"];

const statusMap = {
  ok:  { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a", label: "In Stock"   },
  lw:  { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030", label: "Low"        },
  ct:  { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030", label: "Critical"   },
  ov:  { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6", label: "Overstock"  },
};

const riskStyle = {
  high:   { bg: "#fdf0f0", color: "#8a2020" },
  medium: { bg: "#fdf8e8", color: "#8a7020" },
  low:    { bg: "#eef6ee", color: "#3a7a3a" },
};

const metColor = v => v >= 85 ? C.green : v >= 65 ? "#c8a030" : "#c83030";
const trendArrow = t => t === "up" ? "▲" : t === "down" ? "▼" : "→";
const trendColor  = t => t === "up" ? C.green : t === "down" ? "#c83030" : C.textDim;

export default function SupplierInventoryPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search,       setSearch]       = useState("");
  const [invData,      setInvData]      = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const invRes = await fetchJson("/business-pages/inventory");
        if (!ignore && invRes?.items) {
          const mapped = invRes.items.map((item, idx) => ({
            id: item.id || `SKU-${idx + 1}`,
            name: item.name,
            cat: item.category || "General",
            qty: item.qty || 0,
            cap: (item.reorder || 0) * 10 || 1000,
            ro: item.reorder || 0,
            st: item.status === "critical" ? "ct" : item.status === "low" ? "lw" : "ok",
            sup: item.supplier || "—",
            rt: "98%",
            ld: 3,
            lok: true,
            u: "units",
          }));
          setInvData(mapped);
        }

        const suppRes = await fetchJson("/business-pages/suppliers");
        if (!ignore && suppRes?.mySuppliers) {
          const mappedSupp = suppRes.mySuppliers.map(s => ({
            name: s.name,
            cat: s.category,
            grade: s.badge || "Ranked",
            score: s.weightedScore || s.rating * 20,
            items: 10,
            trend: "up",
            tl: s.leadTime,
            metrics: [
              { l: "On-Time Delivery", v: parseInt(s.onTime) || 95, d: s.onTime || "95%" },
              { l: "Quality Rating", v: Math.round(s.rating * 20) || 90, d: `${s.rating}/5` },
              { l: "Fill Rate", v: parseInt(s.fillRate) || 90, d: s.fillRate || "90%" },
              { l: "Weighted Score", v: Math.round(s.weightedScore) || 85, d: `${s.weightedScore}/100` },
            ],
          }));
          setSuppliers(mappedSupp);
        }
      } catch {
        /* ignore fallback */
      }
    }

    loadData();
    return () => { ignore = true; };
  }, []);

  const filtered = invData.filter(i => {
    const q      = search.toLowerCase();
    const matchS = i.name.toLowerCase().includes(q) || i.sup.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q);
    const matchF =
      activeFilter === "All"       ? true :
      activeFilter === "Critical"  ? i.st === "ct" :
      activeFilter === "Low"       ? i.st === "lw" :
      activeFilter === "OK"        ? i.st === "ok" :
      activeFilter === "Overstock" ? i.st === "ov" : true;
    return matchS && matchF;
  });

  const counts = {
    total: invData.length,
    ok:    invData.filter(i => i.st === "ok").length,
    lw:    invData.filter(i => i.st === "lw").length,
    ct:    invData.filter(i => i.st === "ct").length,
    ov:    invData.filter(i => i.st === "ov").length,
  };

  return (
    <div style={{ ...ibm }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Inventory</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>Real-time stock levels · No data yet</p>
        </div>
        <div style={{ padding: "8px 16px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600, letterSpacing: "0.5px" }}>
          ◈ Live Feed
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total SKUs",  value: counts.total, sub: "No data yet", accent: true  },
          { label: "In Stock",    value: counts.ok,    sub: "No data yet", accent: false },
          { label: "Low Stock",   value: counts.lw,    sub: "No data yet", accent: false },
          { label: "Critical",    value: counts.ct,    sub: "No data yet", accent: false },
          { label: "Overstock",   value: counts.ov,    sub: "No data yet", accent: false },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.accent ? C.green : C.card, borderRadius: 10,
            padding: "16px", border: s.accent ? "none" : `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden",
          }}>
            <div style={{ fontSize: 10, color: s.accent ? "rgba(255,255,255,0.7)" : C.textDim, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 700, color: s.accent ? "#fff" : C.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.accent ? "rgba(255,255,255,0.6)" : C.textDim, marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Supplier Health Grid */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Supplier Performance</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Health scores by delivery, quality, fill rate & pricing · No data yet</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {suppliers.map((s) => (
          <div key={s.name} style={{ background: C.card, borderRadius: 12, padding: "18px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{s.cat}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...syne, fontSize: 22, fontWeight: 700, color: C.textDim }}>{s.grade}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{s.score}/100</div>
              </div>
            </div>
            {s.metrics.map((m) => (
              <div key={m.l} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textDim, marginBottom: 3 }}>
                  <span>{m.l}</span>
                  <span style={{ fontWeight: 600, color: C.text }}>{m.d}</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${m.v}%`, height: "100%", background: metColor(m.v), borderRadius: 99 }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11 }}>
              <span style={{ color: C.textDim }}><strong style={{ color: C.text }}>{s.items}</strong> SKUs supplied</span>
              <span style={{ color: trendColor(s.trend), fontWeight: 600 }}>{trendArrow(s.trend)} {s.tl}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Table */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${C.border}`, background: C.greenSubtle }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text }}>Stock Inventory</div>
            <div style={{ display: "flex", gap: 4 }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${activeFilter === f ? C.green : "transparent"}`,
                  background: activeFilter === f ? C.green : "transparent",
                  color: activeFilter === f ? "#fff" : C.textDim,
                  fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, transition: "all .12s",
                }}>{f}</button>
              ))}
            </div>
          </div>
          <input
            placeholder="Search product or supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
              {["Product", "Category", "Stock Level", "Reorder Qty", "Supplier", "Lead Time", "Status", "Action"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 18px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const pct = item.cap > 0 ? Math.min(100, Math.round((item.qty / item.cap) * 100)) : 0;
              const s   = statusMap[item.st] || statusMap.ok;
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", marginTop: 2 }}>{item.id}</div>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ background: C.greenSubtle, color: C.textMuted, borderRadius: 4, padding: "2px 8px", fontSize: 11, border: `1px solid ${C.greenBorder}` }}>{item.cat}</span>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{item.qty} {item.u}</span>
                      <span style={{ color: C.textDim, fontFamily: "monospace" }}>/{item.cap}</span>
                    </div>
                    <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: "hidden", width: 120 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: s.dot, borderRadius: 99 }} />
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontWeight: 600, fontSize: 13, color: C.text }}>{item.ro}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{item.sup}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{item.rt}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: item.lok ? C.green : "#c8a030" }}>{item.ld}d</td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <button style={{ background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", color: C.green }}>
                      {item.st === "ct" || item.st === "lw" ? "Reorder" : "View"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Risk Alerts */}
        <div style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>◬ Supplier Risk Alerts</div>
          {risks.map((r) => {
            const rs = riskStyle[r.lvl];
            return (
              <div key={r.name} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, color: C.textDim }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{r.desc}</div>
                </div>
                <span style={{ background: rs.bg, color: rs.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  {r.lvl.charAt(0).toUpperCase() + r.lvl.slice(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Reorder Queue */}
        <div style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>◫ Reorder Queue</div>
          {reorders.map((r) => (
            <div key={r.p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.p}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{r.s}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, marginTop: 4, display: "inline-block",
                  background: r.u === "now" ? "#fdf0f0" : "#fdf8e8",
                  color:      r.u === "now" ? "#8a2020"  : "#8a7020",
                }}>
                  {r.u === "now" ? "Order Now" : "Order Soon"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...syne, fontSize: 18, fontWeight: 700, color: C.text }}>{r.q}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>units needed</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}