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
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["Today", "This Week", "This Month"];

/* KPI (SUPPLIER SIDE) */
const kpis = [
  { label: "Action Items", value: "0", sub: "No suggestions yet", icon: "✧", accent: true },
  { label: "Order Opportunities", value: "0", sub: "No suggestions yet", icon: "❊" },
  { label: "Delivery Risks", value: "0", sub: "No suggestions yet", icon: "⍟" },
  { label: "Performance Score", value: "0%", sub: "No suggestions yet", icon: "✵" },
];

/* AI SUGGESTIONS */
const primarySuggestions = [
  {
    title: "No pricing optimization available",
    subtitle: "Pricing",
    priority: "Priority 0",
    impact: "0%",
    action: "No action suggested yet",
    reason: "No supplier data available to generate pricing insight.",
  },
  {
    title: "No inventory restock insight",
    subtitle: "Inventory",
    priority: "Priority 0",
    impact: "0%",
    action: "No action suggested yet",
    reason: "No stock movement data available.",
  },
  {
    title: "No delivery optimization insight",
    subtitle: "Delivery",
    priority: "Priority 0",
    impact: "0%",
    action: "No action suggested yet",
    reason: "No delivery performance data available.",
  },
];

/* OPPORTUNITY CARDS */
const recommendationCards = [
  { title: "Increase order volume", value: "0", note: "No data yet" },
  { title: "Improve delivery speed", value: "0", note: "No data yet" },
  { title: "Optimize stock supply", value: "0", note: "No data yet" },
  { title: "Reduce order delays", value: "0", note: "No data yet" },
];

/* TABLE */
const suggestionTable = [
  { area: "Orders", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Inventory", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Delivery", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Performance", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
];

export default function SAIInsightsPage() {
  const [filter, setFilter] = useState("Today");

  return (
    <div style={{ ...ibm }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 28, background: C.green }}></div>
            <h1 style={{ ...syne, fontSize: 26, fontWeight: 800 }}>
              Supplier AI Insights
            </h1>
          </div>
          <p style={{ marginLeft: 13, color: C.textDim, fontSize: 12 }}>
            Smart supplier recommendations · No data yet
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

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => (
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

      {/* MAIN */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>

        {/* SUGGESTIONS */}
        <div style={{ background: C.card, padding: 24, borderRadius: 12 }}>
          <h3>Top AI Suggestions</h3>
          {primarySuggestions.map((item) => (
            <div key={item.title} style={{ marginBottom: 12 }}>
              <b>{item.title}</b>
              <p>{item.reason}</p>
            </div>
          ))}
        </div>

        {/* OPPORTUNITIES */}
        <div style={{ background: C.cardGreen, padding: 24, borderRadius: 12 }}>
          <h3>Opportunity Summary</h3>
          {recommendationCards.map(card => (
            <div key={card.title}>
              {card.title}: {card.value}
            </div>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div style={{ marginTop: 20 }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {["Area", "Suggestion", "Confidence", "Status"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suggestionTable.map(row => (
              <tr key={row.area}>
                <td>{row.area}</td>
                <td>{row.suggestion}</td>
                <td>{row.confidence}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}