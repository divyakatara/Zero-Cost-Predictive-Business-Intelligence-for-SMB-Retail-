import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line
} from "recharts";

/* SAME FONT SETUP */
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* SAME COLOR SYSTEM */
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

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["All Time", "This Month", "This Week"];

/* ZERO DATA */
const productData = [
  { name: "Product A", value: 0 },
  { name: "Product B", value: 0 },
  { name: "Product C", value: 0 },
  { name: "Product D", value: 0 },
];

const orderTrendData = [
  { name: "Mon", value: 0 },
  { name: "Tue", value: 0 },
  { name: "Wed", value: 0 },
  { name: "Thu", value: 0 },
  { name: "Fri", value: 0 },
  { name: "Sat", value: 0 },
  { name: "Sun", value: 0 },
];

const deliveryData = [
  { name: "W1", onTime: 0, late: 0 },
  { name: "W2", onTime: 0, late: 0 },
  { name: "W3", onTime: 0, late: 0 },
  { name: "W4", onTime: 0, late: 0 },
];

const kpis = [
  { label: "Total Orders", value: "0", sub: "No data yet", icon: "♧", accent: true },
  { label: "Revenue Earned", value: "₹0", sub: "No data yet", icon: "✪" },
  { label: "Active Listings", value: "0", sub: "No data yet", icon: "✡" },
  { label: "On-Time Delivery", value: "0%", sub: "No data yet", icon: "☆" },
];

const buyers = [
  { name: "Buyer 1", orders: 0, spend: "₹0", date: "-", status: "No data" },
  { name: "Buyer 2", orders: 0, spend: "₹0", date: "-", status: "No data" },
  { name: "Buyer 3", orders: 0, spend: "₹0", date: "-", status: "No data" },
];

/* TOOLTIP */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px" }}>
        <p style={{ fontWeight: 700 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey}>{p.dataKey}: <b>{p.value}</b></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SAnalyticsPage() {
  const [filter, setFilter] = useState("All Time");

  return (
    <div style={{ ...ibm }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 28, background: C.green }}></div>
            <h1 style={{ ...syne, fontSize: 26, fontWeight: 800 }}>Supplier Analytics</h1>
          </div>
          <p style={{ marginLeft: 13, color: C.textDim, fontSize: 12 }}>
            Supplier performance overview · No data yet
          </p>
        </div>

        <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 16px",
              border: "none",
              background: filter === f ? C.card : "transparent",
              cursor: "pointer",
              fontFamily: "'IBM Plex Sans'"
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            background: kpi.accent ? C.green : C.card,
            padding: 20,
            borderRadius: 12,
            color: kpi.accent ? "#fff" : C.text
          }}>
            <div>{kpi.label}</div>
            <div style={{ ...syne, fontSize: 26 }}>{kpi.value}</div>
            <div style={{ fontSize: 12 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={productData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={C.green} />
          </BarChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={orderTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke={C.greenMid} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DELIVERY */}
      <div style={{ marginTop: 20 }}>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={deliveryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="onTime" stroke={C.green} fill={C.greenLight} />
            <Area type="monotone" dataKey="late" stroke="#aaa" fill="#ddd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* BUYERS TABLE */}
      <div style={{ marginTop: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Buyer", "Orders", "Spend", "Last Order", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: 10, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buyers.map(b => (
              <tr key={b.name}>
                <td style={{ padding: 10 }}>{b.name}</td>
                <td style={{ padding: 10 }}>{b.orders}</td>
                <td style={{ padding: 10 }}>{b.spend}</td>
                <td style={{ padding: 10 }}>{b.date}</td>
                <td style={{ padding: 10 }}>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}