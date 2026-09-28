import { useState } from "react";

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
  warn: "#c8a030",
  warnBg: "#fdf8e8",
  danger: "#c83030",
  dangerBg: "#fdf0f0",
};

const syne = { fontFamily: "'Syne', sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

/* FILTERS */
const filters = ["All", "Open", "Resolved"];

/* KPI DATA */
const kpis = [
  { label: "Total Alerts", value: "0", sub: "No alerts yet", accent: true },
  { label: "Order Alerts", value: "0", sub: "No alerts yet" },
  { label: "Delivery Alerts", value: "0", sub: "No alerts yet" },
  { label: "System Alerts", value: "0", sub: "No alerts yet" },
];

/* ALERT DATA */
const orderAlerts = [
  {
    title: "No order issue alert",
    subtitle: "Orders",
    severity: "Low",
    status: "No data",
    note: "No order-related issues detected yet.",
  },
];

const deliveryAlerts = [
  {
    title: "No delivery delay alert",
    subtitle: "Delivery",
    severity: "Low",
    status: "No data",
    note: "No delivery issues detected yet.",
  },
];

const systemAlerts = [
  {
    title: "No supplier risk alert",
    subtitle: "System",
    severity: "Low",
    status: "No data",
    note: "No system-related issue detected yet.",
  },
];

const recentTable = [
  { type: "Orders", alert: "No alert yet", severity: "Low", status: "No data" },
  { type: "Delivery", alert: "No alert yet", severity: "Low", status: "No data" },
  { type: "System", alert: "No alert yet", severity: "Low", status: "No data" },
];

/* CARD STYLE */
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

/* ALERT CARD */
function AlertCard({ item, tone = "normal" }) {
  const background =
    tone === "danger"
      ? C.dangerBg
      : tone === "warn"
        ? C.warnBg
        : C.greenSubtle;

  const borderColor =
    tone === "danger"
      ? "#f2bcbc"
      : tone === "warn"
        ? "#ecdca2"
        : C.greenBorder;

  const severityColor =
    tone === "danger"
      ? C.danger
      : tone === "warn"
        ? C.warn
        : C.textMuted;

  return (
    <div
      style={{
        ...ibm,
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 12,
        color: C.text,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              marginTop: 4,
            }}
          >
            {item.subtitle}
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: severityColor,
            whiteSpace: "nowrap",
          }}
        >
          {item.severity}
        </span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 4 }}>
        Status: <b>{item.status}</b>
      </div>

      <div
        style={{
          fontSize: 13,
          color: C.textMuted,
          lineHeight: 1.6,
        }}
      >
        {item.note}
      </div>
    </div>
  );
}

/* SECTION HEADING */
function SectionHeading({ children }) {
  return (
    <h2
      style={{
        ...syne,
        fontSize: 16,
        fontWeight: 700,
        color: C.text,
        margin: "24px 0 12px",
      }}
    >
      {children}
    </h2>
  );
}

export default function SAlertsPage() {
  const [filter, setFilter] = useState("All");

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              Supplier Alerts
            </h1>
          </div>

          <p
            style={{
              margin: "8px 0 0 13px",
              color: C.textDim,
              fontSize: 12,
            }}
          >
            Supplier warnings and system alerts · No data yet
          </p>
        </div>

        {/* EXISTING FILTERS */}
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
                color: C.text,
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
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
              color: kpi.accent ? "#fff" : C.text,
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
                color: kpi.accent ? "#fff" : C.text,
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

      {/* ALERT SECTIONS */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeading>Order Alerts</SectionHeading>

        {orderAlerts.map((alert) => (
          <AlertCard key={alert.title} item={alert} />
        ))}

        <SectionHeading>Delivery Alerts</SectionHeading>

        {deliveryAlerts.map((alert) => (
          <AlertCard key={alert.title} item={alert} />
        ))}

        <SectionHeading>System Alerts</SectionHeading>

        {systemAlerts.map((alert) => (
          <AlertCard key={alert.title} item={alert} />
        ))}
      </div>

      {/* RECENT ALERTS TABLE */}
      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "20px 22px 8px" }}>
          <h2
            style={{
              ...syne,
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
              margin: 0,
            }}
          >
            Recent Alerts
          </h2>

          <p style={{ fontSize: 12, color: C.textDim, margin: "6px 0 0" }}>
            Summary of order, delivery, and system alerts
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
              {["Type", "Alert", "Severity", "Status"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {recentTable.map((row) => (
              <tr key={row.type}>
                <td style={tdStyle}>{row.type}</td>
                <td style={tdStyle}>{row.alert}</td>
                <td style={tdStyle}>{row.severity}</td>
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
                    {row.status}
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
