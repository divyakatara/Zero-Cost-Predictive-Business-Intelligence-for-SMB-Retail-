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
import { API_BASE_URL } from "./api";

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
      lowStockItems: 0,
      activeAlerts: 0,
    },
    monthlySales: emptySalesData,
    topProducts: emptyProductSalesData,
    inventoryRows: [],
    reorderCandidates: [],
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

export default function ERPDashboard({
  activeNav,
  onNavChange,
  settingsTab,
  onSettingsTabChange,
  verificationStatus,
  onVerificationStatusChange,
  verificationPromptOpen,
  onCloseVerificationPrompt,
}) {
  const isVerified = verificationStatus === "Verified";
  const [overview, setOverview] = useState(createEmptyOverview);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (activeNav === "Settings" && !settingsTab) {
      onSettingsTabChange?.("Verification");
    }
  }, [activeNav, settingsTab, onSettingsTabChange]);

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/overview`);
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
    onNavChange?.(label);
    if (label === "Settings") {
      onSettingsTabChange?.("Verification");
    }
  }

  const inventoryData = overview.inventoryRows || [];
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {item.label}
          {item.label === "Settings" && !isVerified && (
            <span
              aria-label="Not verified"
              title="Not verified"
              style={{ fontSize: 12 }}
            >
              !
            </span>
          )}
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
              U
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.sideText,
                }}
              >
                User
              </div>
              <div style={{ fontSize: 11, color: C.sideDim }}>Administrator</div>
            </div>
          </div>
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
                {overview.hasData
                  ? "AI-Driven overview · Live PostgreSQL data"
                  : "AI-Driven overview · Waiting for backend data"}
              </p>
            </div>
            <div
              style={{
                padding: "8px 16px",
                background: C.greenSubtle,
                border: `1px solid ${C.borderGreen}`,
                borderRadius: 8,
                fontSize: 12,
                color: C.green,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              LIVE FEED
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
                  label: "Low Stock Items",
                  value: `${overview.summary.lowStockItems} Items`,
                  sub: overview.hasData
                    ? "Products at or near reorder level"
                    : "Waiting for product import",
                  icon: "!",
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
                  <span style={{ fontSize: 28, color: C.greenMid }}>O</span>
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
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
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      ...syne,
                      fontWeight: 700,
                      color: C.text,
                      fontSize: 15,
                    }}
                  >
                    Inventory Status
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textDim,
                      marginTop: 4,
                    }}
                  >
                    Real-time stock levels · {inventoryData.length} items
                  </div>
                </div>
                <table
                  style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Product", "Stock", "Reorder Lvl", "Status"].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: "left",
                            padding: "7px 8px",
                            color: C.textDim,
                            fontWeight: 500,
                            fontSize: 10,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((row) => {
                      const status = C[row.status.toLowerCase()] || C.good;
                      return (
                        <tr key={row.product} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td
                            style={{
                              padding: "11px 8px",
                              fontWeight: 500,
                              color: C.text,
                            }}
                          >
                            {row.product}
                          </td>
                          <td style={{ padding: "11px 8px", color: C.textMuted }}>
                            {row.stock} units
                          </td>
                          <td style={{ padding: "11px 8px", color: C.textMuted }}>
                            {row.reorder}
                          </td>
                          <td style={{ padding: "11px 8px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                background: status.bg,
                                color: status.color,
                                padding: "3px 10px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: "0.5px",
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background: status.dot,
                                  display: "inline-block",
                                }}
                              />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  background: C.cardGreen,
                  borderRadius: 12,
                  padding: "24px",
                  border: `1px solid ${C.borderGreen}`,
                  boxShadow: "0 1px 4px rgba(74,122,73,0.08)",
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
                        color: C.green,
                        fontSize: 15,
                      }}
                    >
                      AI Reorder
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginTop: 4,
                      }}
                    >
                      Rule-based decision engine
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#fff",
                      color: C.green,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: `1px solid ${C.borderGreen}`,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {overview.reorderCandidates.length ? "ACTION" : "STABLE"}
                  </span>
                </div>
                <div
                  style={{
                    height: 190,
                    background: "#fff",
                    borderRadius: 8,
                    border: `1px dashed ${C.borderGreen}`,
                    padding: "18px 16px",
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {overview.reorderCandidates.length ? (
                    overview.reorderCandidates.map((item) => (
                      <div
                        key={item.product}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              fontWeight: 600,
                            }}
                          >
                            {item.product}
                          </div>
                          <div style={{ fontSize: 11, color: C.textDim }}>
                            Stock {item.stock} · Reorder {item.reorder}
                          </div>
                        </div>
                        <span
                          style={{ fontSize: 11, color: C.green, fontWeight: 700 }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <span
                        style={{
                          fontSize: 28,
                          color: C.greenMid,
                          textAlign: "center",
                        }}
                      >
                        O
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: C.textMuted,
                          fontWeight: 500,
                          textAlign: "center",
                        }}
                      >
                        No urgent reorder recommendations
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.textDim,
                          textAlign: "center",
                        }}
                      >
                        Current product stock is above reorder levels
                      </span>
                    </>
                  )}
                </div>
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
                  alignItems: "center",
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
                    Anomaly & System Alerts
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textDim,
                      marginTop: 4,
                    }}
                  >
                    Database-driven stock and supplier monitoring
                  </div>
                </div>
                <span
                  style={{
                    background: C.greenSubtle,
                    color: C.green,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 14px",
                    borderRadius: 4,
                    border: `1px solid ${C.borderGreen}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    letterSpacing: "0.5px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: C.green,
                      display: "inline-block",
                    }}
                  />
                  {overview.summary.activeAlerts} ACTIVE
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "28px 0",
                  color: C.textDim,
                  fontSize: 13,
                  background: C.greenSubtle,
                  borderRadius: 8,
                  border: `1px dashed ${C.borderGreen}`,
                }}
              >
                <span style={{ color: C.greenMid }}>!</span>
                {overview.summary.activeAlerts
                  ? `${overview.summary.activeAlerts} attention points found in your imported data`
                  : "All clear - no active alerts"}
              </div>
            </div>
          </>
        )}

        {activeNav === "Inventory" && <InventoryPage />}
        {activeNav === "Sales" && <SalesPage />}
        {activeNav === "Supplier Marketplace" && <SupplierMarketplacePage />}
        {activeNav === "Analytics" && <BAnalyticsPage />}
        {activeNav === "AI Insights" && <BAIInsightsPage />}
        {activeNav === "Alerts" && <BAlertsPage />}
        {activeNav === "Settings" && (
          <BSettingsPage
            activeTab={settingsTab || "Business Profile"}
            onTabChange={onSettingsTabChange}
            verificationStatus={verificationStatus}
            onVerificationStatusChange={onVerificationStatusChange}
          />
        )}
      </main>

      {verificationPromptOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(42,42,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: C.card,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              padding: 24,
              boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                ...syne,
                fontSize: 18,
                fontWeight: 800,
                color: C.text,
                marginBottom: 10,
              }}
            >
              Verify your profile using GSTIN
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 22 }}>
              Add your GST details to continue with verification.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={onCloseVerificationPrompt}
                style={{
                  padding: "10px 16px",
                  background: "#fff",
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Later
              </button>
              <button
                onClick={() => {
                  handleNavClick("Settings");
                  onSettingsTabChange?.("Verification");
                  onCloseVerificationPrompt?.();
                }}
                style={{
                  padding: "10px 16px",
                  background: C.green,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
