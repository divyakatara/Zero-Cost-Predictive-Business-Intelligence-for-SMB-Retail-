import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

/* GOOGLE FONTS */
const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap";
fontLink.rel = "stylesheet";

if (!document.querySelector('link[data-supplier-fonts]')) {
  fontLink.dataset.supplierFonts = "true";
  document.head.appendChild(fontLink);
}

/* COLOR SYSTEM */
const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  cardGreen: "#eef4ee",
  green: "#4a7a49",
  greenLight: "#c8d8c7",
  greenMid: "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
};

const syne = { fontFamily: "'Syne', sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["All Time", "This Month", "This Week"];

const PERIODS = { "All Time": "all", "This Month": "month", "This Week": "week" };

const emptyState = {
  headerNote: "Loading demand for your products…",
  kpis: [],
  productData: [],
  orderTrendData: [],
  revenueTrend: [],
  buyers: [],
};

/* SHARED CARD STYLE */
const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 22,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

/* TABLE STYLES */
const thStyle = {
  textAlign: "left",
  padding: "13px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: C.textMuted,
  borderBottom: `1px solid ${C.border}`,
};

const tdStyle = {
  padding: "14px 12px",
  fontSize: 13,
  color: C.text,
  borderBottom: `1px solid ${C.border}`,
};

/* TOOLTIP */
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        ...ibm,
        background: C.card,
        border: `1px solid ${C.greenBorder}`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 12,
        color: C.text,
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>

      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: "4px 0" }}>
          {unit || p.dataKey}: <b>{Number(p.value).toLocaleString("en-IN")}</b>
        </p>
      ))}
    </div>
  );
};

/* CHART AXIS STYLE */
const axisTick = {
  fontSize: 11,
  fill: C.textMuted,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

export default function SAnalyticsPage({ user }) {
  const supplierId = user?.supplier_id;
  const [filter, setFilter] = useState("All Time");
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplierId) return undefined;
    let ignore = false;
    fetchJson(`/suppliers/${encodeURIComponent(supplierId)}/analytics?period=${PERIODS[filter]}`)
      .then((response) => { if (!ignore) { setData(response); setError(""); } })
      .catch((err) => { if (!ignore) setError(err.message || "Could not load analytics."); });
    return () => { ignore = true; };
  }, [supplierId, filter]);

  const { kpis, productData, orderTrendData, revenueTrend, buyers } = data;

  return (
    <div
      style={{
        ...ibm,
        fontSize: 13,
        lineHeight: 1.5,
        color: C.text,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 3,
                height: 28,
                background: C.green,
                borderRadius: 3,
              }}
            />

            <h1
              style={{
                ...syne,
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: C.text,
                letterSpacing: "0.2px",
              }}
            >
              Supplier Analytics
            </h1>
          </div>

          <p
            style={{
              margin: "8px 0 0 13px",
              color: C.textDim,
              fontSize: 12,
            }}
          >
            {supplierId ? data.headerNote : "This account is not linked to a supplier ID"}
          </p>
        </div>

        {/* FILTERS — corrected on Analytics only */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "#eee8e0",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px",
                borderRadius: 7,
                border: "none",
                background: filter === f ? C.card : "transparent",
                color: filter === f ? C.text : C.textMuted,
                fontWeight: filter === f ? 600 : 400,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                boxShadow:
                  filter === f
                    ? "0 1px 4px rgba(0,0,0,0.08)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fdf0f0", border: "1px solid #f0c8c0", borderRadius: 10, color: "#b8543f", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.accent ? C.green : C.card,
              borderRadius: 12,
              padding: "22px 20px",
              border: kpi.accent ? "none" : `1px solid ${C.border}`,
              boxShadow: kpi.accent
                ? "0 4px 16px rgba(74,122,73,0.15)"
                : "0 1px 4px rgba(0,0,0,0.04)",
              color: kpi.accent ? "#ffffff" : C.text,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: kpi.accent ? "rgba(255,255,255,0.75)" : C.textDim,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {kpi.label}
            </div>

            <div
              style={{
                ...syne,
                fontSize: 27,
                fontWeight: 700,
                lineHeight: 1.3,
                marginTop: 10,
                color: kpi.accent ? "#ffffff" : C.text,
              }}
            >
              {kpi.value}
            </div>

            <div
              style={{
                fontSize: 12,
                marginTop: 7,
                color: kpi.accent ? "rgba(255,255,255,0.7)" : C.textDim,
              }}
            >
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* PRODUCT CHART */}
        <div style={cardStyle}>
          <h2
            style={{
              ...syne,
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              margin: "0 0 20px",
            }}
          >
            Units Sold by Product
          </h2>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={productData} margin={{ top: 5, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="Units sold" />} />
              <Bar dataKey="value" fill={C.green} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ORDER TREND CHART */}
        <div style={cardStyle}>
          <h2
            style={{
              ...syne,
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              margin: "0 0 20px",
            }}
          >
            Orders by Weekday
          </h2>

          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={orderTrendData} margin={{ top: 5, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.border}
                vertical={false}
              />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="Orders" />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={C.greenMid}
                strokeWidth={2}
                dot={{ fill: C.green, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* REVENUE TREND */}
      <div style={{ ...cardStyle, marginBottom: 22 }}>
        <h2
          style={{
            ...syne,
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            margin: "0 0 20px",
          }}
        >
          Revenue Trend
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueTrend} margin={{ top: 5, right: 8, left: 6, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.border}
              vertical={false}
            />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
            <Tooltip content={<CustomTooltip unit="Revenue (₹)" />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={C.green}
              fill={C.greenLight}
              fillOpacity={0.55}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* BUYER TABLE */}
      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "20px 22px 8px" }}>
          <h2
            style={{
              ...syne,
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              margin: 0,
            }}
          >
            Retail Branches Buying Your Products
          </h2>
          <p style={{ fontSize: 12, color: C.textDim, margin: "6px 0 0" }}>
            Orders and spending per branch in the selected period
          </p>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: C.card,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              {["Branch", "Orders", "Spend", "Last Order", "Status"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {buyers.map((b) => (
              <tr key={b.name}>
                <td style={tdStyle}>{b.name}</td>
                <td style={tdStyle}>{b.orders}</td>
                <td style={tdStyle}>{b.spend}</td>
                <td style={tdStyle}>{b.date}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 5,
                      background: C.greenSubtle,
                      color: C.textMuted,
                      fontSize: 11,
                    }}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
