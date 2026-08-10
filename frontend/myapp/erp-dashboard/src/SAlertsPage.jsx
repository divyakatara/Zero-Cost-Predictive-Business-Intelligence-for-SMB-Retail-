import { useState } from "react";

/* SAME FONT SETUP */
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* SAME COLORS */
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

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["All", "Open", "Resolved"];

/* KPI (SUPPLIER) */
const kpis = [
  { label: "Total Alerts", value: "0", sub: "No alerts yet", icon: "✩", accent: true },
  { label: "Order Alerts", value: "0", sub: "No alerts yet", icon: "▹" },
  { label: "Delivery Alerts", value: "0", sub: "No alerts yet", icon: "◉" },
  { label: "System Alerts", value: "0", sub: "No alerts yet", icon: "🕸" },
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

/* ALERT CARD */
function AlertCard({ item, tone }) {
  return (
    <div style={{
      background: tone === "danger" ? C.dangerBg : tone === "warn" ? C.warnBg : C.greenSubtle,
      border: `1px solid ${tone === "danger" ? "#f2bcbc" : tone === "warn" ? "#ecdca2" : C.greenBorder}`,
      borderRadius: 10,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{item.title}</div>
          <div style={{ fontSize: 11 }}>{item.subtitle}</div>
        </div>
        <span>{item.severity}</span>
      </div>
      <div>Status: <b>{item.status}</b></div>
      <div>{item.note}</div>
    </div>
  );
}

export default function SAlertsPage() {
  const [filter, setFilter] = useState("All");

  return (
    <div style={{ ...ibm }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 28, background: C.green }}></div>
            <h1 style={{ ...syne, fontSize: 26, fontWeight: 800 }}>
              Supplier Alerts
            </h1>
          </div>
          <p style={{ marginLeft: 13, color: C.textDim, fontSize: 12 }}>
            Supplier warnings and system alerts · No data yet
          </p>
        </div>

        <div>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ padding: 20, background: "#fff" }}>
            <div>{k.label}</div>
            <div style={{ ...syne }}>{k.value}</div>
            <div>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ALERTS */}
      <div style={{ marginTop: 20 }}>
        <h3>Order Alerts</h3>
        {orderAlerts.map(a => <AlertCard key={a.title} item={a} />)}

        <h3>Delivery Alerts</h3>
        {deliveryAlerts.map(a => <AlertCard key={a.title} item={a} />)}

        <h3>System Alerts</h3>
        {systemAlerts.map(a => <AlertCard key={a.title} item={a} />)}
      </div>

      {/* TABLE */}
      <table style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Alert</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recentTable.map(r => (
            <tr key={r.type}>
              <td>{r.type}</td>
              <td>{r.alert}</td>
              <td>{r.severity}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}