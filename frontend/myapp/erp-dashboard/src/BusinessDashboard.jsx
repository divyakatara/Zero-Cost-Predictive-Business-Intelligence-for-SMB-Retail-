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
import NotificationBell from "./NotificationBell";
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
  "Dashboard",
  "Inventory",
  "Sales",
  "Procurement AI",
  "Supplier Marketplace",
  "Analytics",
  "AI Insights",
  "Alerts",
  "Settings",
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
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
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
      <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: C.border, marginBottom: 16 }}>
        {order.map((key) => (health[key] ? (
          <div key={key} title={`${key}: ${health[key]}`} style={{ width: `${(health[key] / Math.max(total, 1)) * 100}%`, background: healthColors[key] }} />
        ) : null))}
      </div>
      {/* Same dot / label / value legend as the Sales of Products card. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {order.map((key) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: healthColors[key], display: "inline-block" }} />
              {key}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{health[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReorderCard({ candidates, onReview }) {
  return (
    <div style={cardStyle}>
      <CardHeader
        title="AI Reorder"
        subtitle="From the Procurement AI's reorder analysis"
        action={(
          <span style={{ background: C.greenSubtle, color: C.green, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4, border: `1px solid ${C.borderGreen}` }}>
            {candidates.length ? `${candidates.length} TO REORDER` : "STABLE"}
          </span>
        )}
      />
      {candidates.length === 0 ? (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 0 4px", textAlign: "center", fontSize: 13, color: C.textMuted }}>
          Every product is above its reorder level.
        </div>
      ) : (
        <div>
          {candidates.map((item) => {
            const tone = C[item.status === "Critical" ? "critical" : "low"];
            return (
              <div key={item.productId} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 12px" }}>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.product}</span>
                    <span style={{ background: tone.bg, color: tone.color, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4 }}>{item.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
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
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [procurementFocusId, setProcurementFocusId] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  // Isolation Forest results load separately so the dashboard never waits on the model.
  // Only the count is needed here (it feeds the notification bell); the Alerts page has the rows.
  useEffect(() => {
    if (activeNav !== "Dashboard") return undefined;
    let ignore = false;
    fetchJson("/anomaly/anomalies?limit=1")
      .then((res) => { if (!ignore) setAnomalies({ total: res.total_anomalies, rows: res.total_rows }); })
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
          setOverviewLoading(false);
        }
      } catch {
        if (!ignore) {
          setOverview(createEmptyOverview());
          setDashboardError("Could not load live dashboard data from the backend.");
          setOverviewLoading(false);
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

  const sidebarBtn = (label) => {
    const active = activeNav === label;

    return (
      <button
        key={label}
        onClick={() => handleNavClick(label)}
        style={{
          display: "block",
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
        {label}
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
            <NotificationBell
              alerts={overview.alerts}
              anomalies={anomalies}
              loading={overviewLoading}
              error={Boolean(dashboardError)}
              storageId={business?.id ?? business?.email ?? business?.userEmail ?? "business"}
              onNavigate={handleNavClick}
            />
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
                background: C.cardGreen,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 12,
                padding: "28px 32px",
                marginBottom: 28,
                display: "flex",
                alignItems: "center",
                gap: 32,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...syne, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
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
                        padding: "9px 18px",
                        background: C.green,
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}
                    >
                      Load Demo Dataset
                    </button>
                    <button
                      onClick={() => handleNavClick("Settings")}
                      style={{ ...linkButtonStyle, padding: "9px 18px", background: "#fff" }}
                    >
                      Go to Data Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                  accent: true,
                },
                {
                  label: "Total Profit",
                  value: formatCurrency(overview.summary.totalProfit),
                  sub: overview.hasData
                    ? "Calculated from imported retail sales"
                    : "Waiting for sales import",
                  accent: false,
                },
                {
                  label: "Total Revenue",
                  value: formatCurrency(overview.summary.totalRevenue),
                  sub: overview.hasData
                    ? "All recorded retail sales"
                    : "Waiting for sales import",
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
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
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
                      fontSize: 10,
                      color: kpi.accent ? "rgba(255,255,255,0.7)" : C.textDim,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    {kpi.label}
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
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
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
                    gap: 12,
                    marginBottom: 18,
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
                  <button style={linkButtonStyle} onClick={() => handleNavClick("Analytics")}>
                    View analytics →
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
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ flex: "1 1 0" }}>
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
                  <button style={linkButtonStyle} onClick={() => handleNavClick("Sales")}>
                    View sales →
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 0 20px",
                  }}
                >
                  <SalesShareDonut products={topProducts} />
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

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, marginBottom: 24 }}>
              <StockHealthCard
                health={overview.stockHealth}
                total={overview.productCount}
                onOpen={() => handleNavClick("Inventory")}
              />
              <ReorderCard candidates={overview.reorderCandidates} onReview={openProcurementFor} />
            </div>

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

