import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

// Sample Data
const allTimeData = [
  { month: "Jan", actual: 0, predicted: 0 },
  { month: "Feb", actual: 0, predicted: 0 },
  { month: "Mar", actual: 0, predicted: 0 },
  { month: "Apr", actual: 0, predicted: 0 },
  { month: "May", actual: 0, predicted: 0 },
  { month: "Jun", actual: 0, predicted: 0 },
  { month: "Jul", actual: 0, predicted: 0 },
  { month: "Aug", actual: 0, predicted: 0 },
  { month: "Sep", actual: 0, predicted: 0 },
  { month: "Oct", actual: 0, predicted: 0 },
  { month: "Nov", actual: 0, predicted: 0 },
  { month: "Dec", actual: 0, predicted: 0 },
];

const thisMonthData = [
  { month: "Week 1", actual: 0, predicted: 0 },
  { month: "Week 2", actual: 0, predicted: 0 },
  { month: "Week 3", actual: 0, predicted: 0 },
  { month: "Week 4", actual: 0, predicted: 0 },
];

const thisWeekData = [
  { month: "Mon", actual: 0, predicted: 0 },
  { month: "Tue", actual: 0, predicted: 0 },
  { month: "Wed", actual: 0, predicted: 0 },
  { month: "Thu", actual: 0, predicted: 0 },
  { month: "Fri", actual: 0, predicted: 0 },
  { month: "Sat", actual: 0, predicted: 0 },
  { month: "Sun", actual: 0, predicted: 0 },
];

const topProducts = [
  { name: "Product 1", revenue: 0, units: 0, trend: "up"   },
  { name: "Product 2", revenue: 0, units: 0, trend: "up"   },
  { name: "Product 3", revenue: 0, units: 0, trend: "down" },
  { name: "Product 4", revenue: 0, units: 0, trend: "up"   },
  { name: "Product 5", revenue: 0, units: 0, trend: "down" },
];

const topProductsChart = [
  { name: "Product 1", revenue: 0 },
  { name: "Product 2", revenue: 0 },
  { name: "Product 3", revenue: 0 },
  { name: "Product 4", revenue: 0 },
  { name: "Product 5", revenue: 0 },
];

const kpis = [
  { label: "Total Revenue",    value: "₹ 0", sub: "No data yet", icon: "◈", accent: true  },
  { label: "Total Orders",     value: "0",   sub: "No data yet", icon: "◎", accent: false },
  { label: "Avg Order Value",  value: "₹ 0", sub: "No data yet", icon: "◉", accent: false },
  { label: "Predicted (Next)", value: "₹ 0", sub: "No data yet", icon: "◌", accent: false },
];

const filters = ["All Time", "This Month", "This Week"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 160 }}>
        <p style={{ fontWeight: 700, color: C.textMuted, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }}></span>
            <span style={{ fontSize: 13, color: C.textMuted }}>{p.dataKey === "actual" ? "Actual" : "Predicted"}:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>₹{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <p style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 13, color: C.textMuted }}>Revenue: <span style={{ fontWeight: 700, color: C.green }}>₹{payload[0].value.toLocaleString()}</span></p>
      </div>
    );
  }
  return null;
};

export default function SSalesPage() {
  const [filter,         setFilter]         = useState("All Time");
  const [hoveredKpi,     setHoveredKpi]     = useState(null);
  const [hoveredProduct, setHoveredProduct] = useState(null);

  const chartData = filter === "All Time"
    ? allTimeData
    : filter === "This Month"
      ? thisMonthData
      : thisWeekData;

  return (
    <div style={{ ...ibm }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Sales</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>Overview, predictions & top products · No data yet</p>
        </div>
        <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, gap: 2 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 16px", borderRadius: 7, border: "none",
              background: filter === f ? C.card : "transparent",
              color: filter === f ? C.text : C.textDim,
              fontWeight: filter === f ? 600 : 400,
              fontSize: 12, cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all .15s",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label}
            onMouseEnter={() => setHoveredKpi(i)}
            onMouseLeave={() => setHoveredKpi(null)}
            style={{
              background: kpi.accent ? C.green : C.card,
              borderRadius: 12, padding: "22px 24px",
              border: kpi.accent ? "none" : `1px solid ${hoveredKpi === i ? C.greenBorder : C.border}`,
              boxShadow: hoveredKpi === i
                ? kpi.accent ? "0 8px 24px rgba(74,122,73,0.35)" : "0 4px 16px rgba(74,122,73,0.12)"
                : kpi.accent ? "0 4px 16px rgba(74,122,73,0.2)" : "0 1px 4px rgba(0,0,0,0.04)",
              position: "relative", overflow: "hidden",
              transform: hoveredKpi === i ? "translateY(-2px)" : "none",
              transition: "all .2s ease",
              cursor: "default",
            }}>
            {kpi.accent && <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }}></div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: kpi.accent ? "rgba(255,255,255,0.7)" : C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600 }}>{kpi.label}</span>
              <span style={{ fontSize: 18, color: kpi.accent ? "rgba(255,255,255,0.8)" : C.textDim }}>{kpi.icon}</span>
            </div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 700, color: kpi.accent ? "#fff" : C.text, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: kpi.accent ? "rgba(255,255,255,0.65)" : C.textDim, marginTop: 8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Sales Prediction Chart */}
      <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Sales Prediction</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Actual vs Predicted · {filter} · Hover over points for details</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[{ label: "Actual", color: C.green }, { label: "Predicted", color: C.greenMid }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>
                <span style={{ width: 14, height: 2, background: l.color, borderRadius: 2, display: "inline-block" }}></span>
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActualSupplier" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradPredictedSupplier" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.greenMid} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.greenMid} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.greenBorder, strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area type="monotone" dataKey="actual" stroke={C.green} strokeWidth={2.5} fill="url(#gradActualSupplier)"
              dot={{ r: 4, fill: C.green, strokeWidth: 0 }}
              activeDot={{ r: 7, fill: C.green, stroke: "#fff", strokeWidth: 2 }} />
            <Area type="monotone" dataKey="predicted" stroke={C.greenMid} strokeWidth={2} strokeDasharray="5 4" fill="url(#gradPredictedSupplier)"
              dot={{ r: 4, fill: C.greenMid, strokeWidth: 0 }}
              activeDot={{ r: 7, fill: C.greenMid, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Product list */}
        <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>Top Selling Products</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>Ranked by revenue · {filter} · Hover for details</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topProducts.map((p, i) => (
              <div key={p.name}
                onMouseEnter={() => setHoveredProduct(i)}
                onMouseLeave={() => setHoveredProduct(null)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10,
                  background: hoveredProduct === i ? C.greenSubtle : "transparent",
                  border: hoveredProduct === i ? `1px solid ${C.greenBorder}` : "1px solid transparent",
                  transition: "all .15s", cursor: "default",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 35, height: 35, borderRadius: 10, background: hoveredProduct === i ? C.green : "#e8e1d7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: hoveredProduct === i ? "#fff" : C.textDim, transition: "all .15s" }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{p.units} units sold</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>₹{p.revenue.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: p.trend === "up" ? C.green : "#c83030", marginTop: 8, fontWeight: 500 }}>
                    {p.trend === "up" ? "▲" : "▼"} No data
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Product */}
        <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>Revenue by Product</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>Hover over bars for details · {filter}</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProductsChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: C.greenSubtle }} />
              <Bar dataKey="revenue" fill={C.greenSubtle} radius={[6, 6, 0, 0]}
                onMouseEnter={(_, i) => setHoveredProduct(i)}
                onMouseLeave={() => setHoveredProduct(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}