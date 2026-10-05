import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import InventoryPage from "./BInventoryPage";
import SalesPage from "./BSalesPage";
import SupplierMarketplacePage from "./BSupplierMarketplace";
import BAnalyticsPage from "./BAnalyticsPage";
import BAIInsightsPage from "./BAIInsightsPage";
import BAlertsPage from "./BAlertsPage";
import BSettingsPage from "./BSettingsPage";
import ProcurementAgentPage from "./BProcurementAgentPage";
import ChatWidget from "./ChatWidget";
import { apiFetch, fetchJson } from "./api";

const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg: "#f5f2ec",
  sidebar: "#2a2a2a",
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
  borderGreen: "#c8d8c7",
  sideText: "#c8d8c7",
  sideMuted: "#7a8a7a",
  sideDim: "#4a5a4a",
  sideBorder: "#3a3a3a",
  good: { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a" },
  low: { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030" },
  critical: { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030" },
};

const emptySalesData = [
  { month: "Jul", actual: 0, predicted: 0 },
  { month: "Aug", actual: 0, predicted: 0 },
  { month: "Sep", actual: 0, predicted: 0 },
  { month: "Oct", actual: 0, predicted: 0 },
  { month: "Nov", actual: 0, predicted: 0 },
  { month: "Dec", actual: 0, predicted: 0 },
];

const chartColors = ["#4a7a49", "#7aaa79", "#aacaa9", "#c8d8c7"];

const emptyProductSalesData = [
  { name: "item_1", value: 0, percentage: 0, color: chartColors[0] },
  { name: "item_2", value: 0, percentage: 0, color: chartColors[1] },
  { name: "item_3", value: 0, percentage: 0, color: chartColors[2] },
  { name: "item_4", value: 0, percentage: 0, color: chartColors[3] },
];

const navItems = [
  { label: "Dashboard", icon: "D" },
  { label: "Inventory", icon: "I" },
  { label: "Sales", icon: "S" },
  { label: "Procurement AI", icon: "P" },
  { label: "Supplier Marketplace", icon: "M" },
  { label: "Analytics", icon: "A" },
  { label: "AI Insights", icon: "AI" },
  { label: "Alerts", icon: "!" },
  { label: "Settings", icon: "S" },
];

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

function createEmptyOverview() {
  return {
    summary: {
      salesToday: 0,
      totalProfit: 0,
      totalRevenue: 0,
      lowStockItems: 0,
      activeAlerts: 0,
    },
    monthlySales: emptySalesData,
    topProducts: emptyProductSalesData,
    stockHealth: { Good: 0, Low: 0, Critical: 0 },
    productCount: 0,
    reorderCandidates: [],
    alerts: [],
    hasData: false,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

// Donut of each top product's share of total revenue; the grey track is all other products.
function SalesShareDonut({ products }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const lengths = products.map((p) => ((p.percentage || 0) / 100) * circumference);
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((sum, l) => sum + l, 0));
  const totalShare = products.reduce((sum, p) => sum + (p.percentage || 0), 0);

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label="Revenue share of top products">
      <circle cx="55" cy="55" r={radius} fill="none" stroke={C.borderGreen} strokeWidth="14" />
      {products.map((p, i) => (
        <circle
          key={p.name}
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={p.color}
          strokeWidth="14"
          strokeDasharray={`${lengths[i]} ${circumference - lengths[i]}`}
          strokeDashoffset={-starts[i]}
          transform="rotate(-90 55 55)"
        />
      ))}
      <text x="55" y="53" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.green}>
        {Math.round(totalShare)}%
      </text>
      <text x="55" y="68" textAnchor="middle" fontSize="8" fill={C.textMuted}>
        of revenue
      </text>
    </svg>
  );
}

const cardStyle = {
  background: C.card,
  borderRadius: 12,
  padding: "24px",
  border: `1px solid ${C.border}`,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const linkButtonStyle = {
  padding: "7px 16px",
  background: C.greenSubtle,
  color: C.green,
  border: `1px solid ${C.borderGreen}`,
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
  whiteSpace: "nowrap",
};

function CardHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
      <div>
        <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

const healthColors = { Good: C.good.dot, Low: C.low.dot, Critical: C.critical.dot };

// One stacked bar instead of a full stock table: the Inventory tab has the details.
function StockHealthCard({ health, total, onOpen }) {
  const order = ["Critical", "Low", "Good"];
  return (
    <div style={cardStyle}>
      <CardHeader
        title="Stock Health"
        subtitle={`${total} products by stock against reorder level`}
        action={<button style={linkButtonStyle} onClick={onOpen}>View inventory →</button>}
      />
      <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", background: C.border, marginBottom: 16 }}>
        {order.map((key) => (health[key] ? (
          <div key={key} title={`${key}: ${health[key]}`} style={{ width: `${(health[key] / Math.max(total, 1)) * 100}%`, background: healthColors[key] }} />
        ) : null))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {order.map((key) => (
          <div key={key} style={{ background: C[key.toLowerCase() === "good" ? "good" : key.toLowerCase()].bg, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: healthColors[key] }} />
              {key}
            </div>
            <div style={{ ...syne, fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>{health[key] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReorderCard({ candidates, onReview }) {
  return (
    <div style={{ ...cardStyle, background: C.cardGreen, border: `1px solid ${C.borderGreen}` }}>
      <CardHeader
        title="AI Reorder"
        subtitle="From the Procurement AI's reorder analysis"
        action={(
          <span style={{ background: "#fff", color: C.green, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4, border: `1px solid ${C.borderGreen}` }}>
            {candidates.length ? `${candidates.length} TO REORDER` : "STABLE"}
          </span>
        )}
      />
      {candidates.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 8, padding: "22px 16px", textAlign: "center", fontSize: 13, color: C.textMuted }}>
          Every product is above its reorder level.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {candidates.map((item) => {
            const tone = C[item.status === "Critical" ? "critical" : "low"];
            return (
              <div key={item.productId} style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.product}</span>
                    <span style={{ background: tone.bg, color: tone.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{item.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                    Stock {item.stock} · reorder level {item.reorder} · order <strong style={{ color: C.text }}>{item.recommendedQuantity}</strong> units
                  </div>
                </div>
                <button style={linkButtonStyle} onClick={() => onReview(item.productId)}>Review →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FEATURE_LABELS = {
  quantity_sold: "Units sold", sales_amount: "Sales", total_cost: "Total cost", profit: "Profit",
  promo: "Promotion", lag_7: "Units 7 days earlier", current_stock: "Stock", price: "Price",
  cost_price: "Cost price", reorder_level: "Reorder level",
};

// "Most deviant dimensions: quantity_sold 130.00 vs avg 34.47 (+5.1 sd); ..." -> "Units sold 130 vs avg 34 (+5.1 sd)"
function topDeviation(explanation) {
  const first = (explanation || "").replace("Most deviant dimensions: ", "").split(";")[0].trim();
  const match = first.match(/^(\w+) ([\d,.]+) vs avg ([\d,.]+) \(([^)]+)\)$/);
  if (!match) return first;
  const [, feature, value, avg, sd] = match;
  const round = (n) => Math.round(Number(n.replace(/,/g, ""))).toLocaleString("en-IN");
  return `${FEATURE_LABELS[feature] || feature} ${round(value)} vs avg ${round(avg)} (${sd})`;
}

const severityStyle = {
  high: { bg: C.critical.bg, color: C.critical.color, label: "High" },
  medium: { bg: C.low.bg, color: C.low.color, label: "Medium" },
};

function AlertsCard({ alerts, anomalies, onNavigate }) {
  const total = alerts.length + (anomalies?.total || 0);
  return (
    <div style={cardStyle}>
      <CardHeader
        title="Anomaly & System Alerts"
        subtitle="Stock and supplier checks, plus transactions flagged by the Isolation Forest model"
        action={<button style={linkButtonStyle} onClick={() => onNavigate("Alerts")}>View all alerts →</button>}
      />
      {total === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: C.textMuted }}>All clear: no active alerts.</div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {alerts.map((alert) => {
          const tone = severityStyle[alert.severity] || severityStyle.medium;
          return (
            <button
              key={alert.title}
              onClick={() => onNavigate(alert.target)}
              style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              <span style={{ background: tone.bg, color: tone.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{tone.label}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text }}>{alert.title}</span>
                <span style={{ display: "block", fontSize: 11, color: C.textDim, marginTop: 2 }}>{alert.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
      {anomalies && (
        <div style={{ marginTop: alerts.length ? 18 : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
            {anomalies.total} of {anomalies.rows.toLocaleString("en-IN")} transactions flagged as unusual · most unusual:
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {anomalies.top.map((row) => (
              <div key={row.transaction_id} style={{ display: "grid", gridTemplateColumns: "100px 100px 80px 1fr", gap: 10, alignItems: "baseline", fontSize: 12, padding: "8px 12px", background: C.greenSubtle, borderRadius: 6 }}>
                <span style={{ fontFamily: "monospace", color: C.textMuted }}>{row.transaction_id}</span>
                <span style={{ color: C.textMuted }}>{row.sale_date}</span>
                <span style={{ fontWeight: 600, color: C.text }}>{row.product_id}</span>
                <span style={{ color: C.textDim }}>{topDeviation(row.explanation)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          ...ibm,
          background: "#fff",
          border: `1px solid ${C.borderGreen}`,
          borderRadius: 8,
          padding: "10px 14px",
          color: C.text,
          fontSize: 13,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <p
          style={{
            marginBottom: 6,
            fontWeight: 600,
            color: C.textMuted,
          }}
        >
          {label}
        </p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color, margin: "2px 0" }}>
            {entry.dataKey === "actual" ? "Revenue" : "Profit"}:{" "}
            {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

// App.jsx only renders this dashboard for approved businesses.
export default function ERPDashboard({ business, onLogout }) {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [overview, setOverview] = useState(createEmptyOverview);
  const [dashboardError, setDashboardError] = useState("");
  const [procurementFocusId, setProcurementFocusId] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  // Isolation Forest results load separately so the dashboard never waits on the model.
  useEffect(() => {
    if (activeNav !== "Dashboard") return undefined;
    let ignore = false;
    fetchJson("/anomaly/anomalies?limit=3")
      .then((res) => { if (!ignore) setAnomalies({ total: res.total_anomalies, rows: res.total_rows, top: res.results }); })
      .catch(() => { if (!ignore) setAnomalies(null); });
    return () => { ignore = true; };
  }, [activeNav]);

  function openProcurementFor(productId) {
    setProcurementFocusId(productId);
    setActiveNav("Procurement AI");
  }

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      try {
        const response = await apiFetch(`/dashboard/overview`);
        if (!response.ok) {
          throw new Error("Dashboard request failed");
        }

        const data = await response.json();
        if (!ignore) {
          setOverview({
            ...createEmptyOverview(),
            ...data,
            monthlySales:
              data.monthlySales && data.monthlySales.length
                ? data.monthlySales
                : emptySalesData,
            topProducts:
              data.topProducts && data.topProducts.length
                ? data.topProducts.map((item, index) => ({
                    ...item,
                    color: chartColors[index % chartColors.length],
                  }))
                : emptyProductSalesData,
          });
          setDashboardError("");
        }
      } catch {
        if (!ignore) {
          setOverview(createEmptyOverview());
          setDashboardError("Could not load live dashboard data from the backend.");
        }
      }
    }

    if (activeNav === "Dashboard") {
      loadOverview();
    }

    return () => {
      ignore = true;
    };
  }, [activeNav]);

  function handleNavClick(label) {
    setActiveNav(label);
  }

  const topProducts = overview.topProducts?.length
    ? overview.topProducts
    : emptyProductSalesData;

  const sidebarBtn = (item) => {
    const active = activeNav === item.label;

    return (
      <button
        key={item.label}
        onClick={() => handleNavClick(item.label)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "11px 24px",
          background: active ? "#3a3a3a" : "transparent",
          color: active ? C.greenLight : C.sideMuted,
          border: "none",
          borderLeft: active
            ? `2px solid ${C.greenLight}`
            : "2px solid transparent",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          transition: "all .15s",
          textAlign: "left",
          fontFamily: "'IBM Plex Sans', sans-serif",
          letterSpacing: "0.2px",
        }}
      >
        <span style={{ fontSize: 14 }}>{item.icon}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "space-between" }}>
          <span>{item.label}</span>
        </span>
      </button>
    );
  };

  return (
    <div
      style={{
        ...ibm,
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        color: C.text,
      }}
    >
      <aside
        style={{
          width: 248,
          background: C.sidebar,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          borderRight: `1px solid ${C.sideBorder}`,
        }}
      >
        <div
          style={{
            padding: "28px 24px 24px",
            borderBottom: `1px solid ${C.sideBorder}`,
          }}
        >
          <div
            style={{
              ...syne,
              fontWeight: 800,
              fontSize: 20,
              color: C.greenLight,
              letterSpacing: "1px",
            }}
          >
            SMART ERP
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.sideDim,
              marginTop: 4,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
            }}
          >
            AI-Driven Business Suite
          </div>
        </div>

        <div style={{ padding: "18px 24px 8px" }}>
          <span
            style={{
              fontSize: 10,
              color: C.sideDim,
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Navigation
          </span>
        </div>

        {navItems.map(sidebarBtn)}

        <div
          style={{
            marginTop: "auto",
            padding: "20px 24px",
            borderTop: `1px solid ${C.sideBorder}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#3a3a3a",
                border: `1px solid ${C.sideBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: C.greenLight,
                fontWeight: 700,
              }}
            >
              {(business?.businessName || "B").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.sideText,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {business?.businessName || "Business"}
              </div>
              <div style={{ fontSize: 11, color: C.sideDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {business?.email || business?.userEmail || "Business account"}
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                color: C.sideText,
                border: `1px solid ${C.sideDim}`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          )}
        </div>
      </aside>
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {activeNav === "Dashboard" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 28,
                    background: C.green,
                    borderRadius: 2,
                  }}
                />
                <h1
                  style={{
                    ...syne,
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 800,
                    color: C.text,
                    letterSpacing: "0.5px",
                  }}
                >
                  Business ERP Dashboard
                </h1>
              </div>
              <p
                style={{
                  margin: "0 0 0 13px",
                  color: C.textDim,
                  fontSize: 12,
                  letterSpacing: "0.5px",
                }}
              >
                {overview.summary.salesToday
                  ? "Live store performance & inventory metrics"
                  : "Overview & summary · Live database data"}
              </p>
            </div>
          </div>
        )}

        {activeNav === "Dashboard" && (
          <>
            {dashboardError && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 14px",
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.textMuted,
                  fontSize: 13,
                }}
              >
                {dashboardError}
              </div>
            )}

            {!overview.hasData && !dashboardError && (
              <div style={{
                background: "linear-gradient(135deg, #f5f2ec 0%, #eef4ee 100%)",
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 14,
                padding: "36px 40px",
                marginBottom: 28,
                display: "flex",
                alignItems: "center",
                gap: 32,
                boxShadow: "0 2px 12px rgba(74,122,73,0.08)",
              }}>
                <div style={{ fontSize: 56 }}>📊</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                    No Business Data Connected
                  </div>
                  <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
                    Your dashboards are ready, but no sales or inventory data has been imported yet.
                    Load the built-in demo dataset or upload your own Excel/CSV file to activate live analytics, charts, and AI insights.
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch(`/api/data/load-demo`, { method: "POST" });
                          if (res.ok) {
                            const response2 = await apiFetch(`/dashboard/overview`);
                            if (response2.ok) {
                              const newData = await response2.json();
                              setOverview({
                                ...createEmptyOverview(),
                                ...newData,
                                monthlySales: newData.monthlySales?.length ? newData.monthlySales : emptySalesData,
                                topProducts: newData.topProducts?.length
                                  ? newData.topProducts.map((item, i) => ({ ...item, color: chartColors[i % chartColors.length] }))
                                  : emptyProductSalesData,
                              });
                              setDashboardError("");
                            }
                          }
                        } catch { /* ignore */ }
                      }}
                      style={{
                        padding: "10px 22px",
                        background: C.green,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        boxShadow: "0 4px 16px rgba(74,122,73,0.25)",
                      }}
                    >
                      🗄️ Load Demo Dataset
                    </button>
                    <button
                      onClick={() => handleNavClick("Settings")}
                      style={{
                        padding: "10px 22px",
                        background: "#fff",
                        color: C.green,
                        border: `1px solid ${C.greenBorder}`,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}
                    >
                      ⚙️ Go to Data Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "Sales Today",
                  value: formatCurrency(overview.summary.salesToday),
                  sub: overview.hasData
                    ? "Latest sale date from database"
                    : "Waiting for sales import",
                  icon: "$",
                  accent: true,
                },
                {
                  label: "Total Profit",
                  value: formatCurrency(overview.summary.totalProfit),
                  sub: overview.hasData
                    ? "Calculated from imported retail sales"
                    : "Waiting for sales import",
                  icon: "+",
                  accent: false,
                },
                {
                  label: "Total Revenue",
                  value: formatCurrency(overview.summary.totalRevenue),
                  sub: overview.hasData
                    ? "All recorded retail sales"
                    : "Waiting for sales import",
                  icon: "₹",
                  accent: false,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    background: kpi.accent ? C.green : C.card,
                    borderRadius: 12,
                    padding: "22px 24px",
                    border: kpi.accent ? "none" : `1px solid ${C.border}`,
                    boxShadow: kpi.accent
                      ? "0 4px 20px rgba(74,122,73,0.2)"
                      : "0 1px 4px rgba(0,0,0,0.04)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {kpi.accent && (
                    <div
                      style={{
                        position: "absolute",
                        top: -24,
                        right: -24,
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: kpi.accent
                          ? "rgba(255,255,255,0.7)"
                          : C.textDim,
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {kpi.label}
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        color: kpi.accent
                          ? "rgba(255,255,255,0.8)"
                          : C.textDim,
                      }}
                    >
                      {kpi.icon}
                    </span>
                  </div>
                  <div
                    style={{
                      ...syne,
                      fontSize: 28,
                      fontWeight: 700,
                      color: kpi.accent ? "#fff" : C.text,
                      lineHeight: 1,
                    }}
                  >
                    {kpi.value}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: kpi.accent
                        ? "rgba(255,255,255,0.65)"
                        : C.textDim,
                      marginTop: 8,
                    }}
                  >
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 18,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: C.card,
                  borderRadius: 12,
                  padding: "24px",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        ...syne,
                        fontWeight: 700,
                        color: C.text,
                        fontSize: 15,
                      }}
                    >
                      Monthly Revenue vs Profit
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textDim,
                        marginTop: 4,
                      }}
                    >
                      {overview.hasData
                        ? "Imported from PostgreSQL retail sales"
                        : "No monthly sales loaded yet"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavClick("Analytics")}
                    style={{
                      padding: "7px 16px",
                      background: C.greenSubtle,
                      color: C.green,
                      border: `1px solid ${C.borderGreen}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                  >
                    View Details
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={overview.monthlySales}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                        <stop
                          offset="95%"
                          stopColor={C.green}
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: C.textDim }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: C.textDim }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke={C.green}
                      strokeWidth={2.5}
                      fill="url(#gradGreen)"
                      dot={{ r: 4, fill: C.green, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke={C.greenMid}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: C.greenMid, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                  {[
                    { label: "Revenue", color: C.green },
                    { label: "Profit", color: C.greenMid },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: C.textDim,
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 2,
                          background: item.color,
                          borderRadius: 2,
                          display: "inline-block",
                        }}
                      />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: C.card,
                  borderRadius: 12,
                  padding: "24px",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        ...syne,
                        fontWeight: 700,
                        color: C.text,
                        fontSize: 15,
                      }}
                    >
                      Sales of Products
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textDim,
                        marginTop: 4,
                      }}
                    >
                      {overview.hasData
                        ? "Top products by revenue share"
                        : "No product sales loaded yet"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavClick("Sales")}
                    style={{
                      padding: "7px 16px",
                      background: C.greenSubtle,
                      color: C.green,
                      border: `1px solid ${C.borderGreen}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                  >
                    View Details
                  </button>
                </div>
                <div
                  style={{
                    height: 160,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    background: C.greenSubtle,
                    borderRadius: 8,
                    border: `1px dashed ${C.borderGreen}`,
                    marginBottom: 16,
                  }}
                >
                  <SalesShareDonut products={topProducts} />
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    {overview.hasData
                      ? `${topProducts.length} products ranked by sales`
                      : "No product data available"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topProducts.map((product) => (
                    <div
                      key={product.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: product.color,
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontSize: 12, color: C.textMuted }}>
                          {product.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.textDim,
                        }}
                      >
                        {product.percentage ?? 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
              <StockHealthCard
                health={overview.stockHealth}
                total={overview.productCount}
                onOpen={() => handleNavClick("Inventory")}
              />
              <ReorderCard candidates={overview.reorderCandidates} onReview={openProcurementFor} />
            </div>

            <AlertsCard alerts={overview.alerts || []} anomalies={anomalies} onNavigate={handleNavClick} />
          </>
        )}

        {activeNav === "Inventory" && (
          <InventoryPage
            onReorder={(productId) => {
              setProcurementFocusId(productId);
              handleNavClick("Procurement AI");
            }}
          />
        )}
        {activeNav === "Sales" && <SalesPage />}
        {activeNav === "Procurement AI" && (
          <ProcurementAgentPage
            business={business}
            focusProductId={procurementFocusId}
            onFocusHandled={() => setProcurementFocusId(null)}
          />
        )}
        {activeNav === "Supplier Marketplace" && <SupplierMarketplacePage business={business} onNavigate={handleNavClick} />}
        {activeNav === "Analytics" && <BAnalyticsPage />}
        {activeNav === "AI Insights" && <BAIInsightsPage onNavigate={handleNavClick} />}
        {activeNav === "Alerts" && <BAlertsPage />}
        {activeNav === "Settings" && <BSettingsPage business={business} onLogout={onLogout} />}
      </main>

      {/* Gemini Chatbot for Business Users */}
      <ChatWidget />
    </div>
  );
}

