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
};

const syne = { fontFamily: "'Syne', sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["Today", "This Week", "This Month"];

/* KPI DATA */
const kpis = [
  { label: "Action Items", value: "0", sub: "No suggestions yet", accent: true },
  { label: "Order Opportunities", value: "0", sub: "No suggestions yet" },
  { label: "Delivery Risks", value: "0", sub: "No suggestions yet" },
  { label: "Performance Score", value: "0%", sub: "No suggestions yet" },
];

/* AI SUGGESTIONS */
const primarySuggestions = [
  {
    title: "No pricing optimization available",
    reason: "No supplier data available to generate pricing insight.",
  },
  {
    title: "No inventory restock insight",
    reason: "No stock movement data available.",
  },
  {
    title: "No delivery optimization insight",
    reason: "No delivery performance data available.",
  },
];

/* OPPORTUNITY SUMMARY */
const recommendationCards = [
  { title: "Increase order volume", value: "0" },
  { title: "Improve delivery speed", value: "0" },
  { title: "Optimize stock supply", value: "0" },
  { title: "Reduce order delays", value: "0" },
];

/* SUGGESTION TABLE */
const suggestionTable = [
  { area: "Orders", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Inventory", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Delivery", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
  { area: "Performance", suggestion: "No suggestion yet", confidence: "0%", status: "No data" },
];

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

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

export default function SAIInsightsPage() {
  const [filter, setFilter] = useState("Today");

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
              Supplier AI Insights
            </h1>
          </div>

          <p
            style={{
              margin: "8px 0 0 13px",
              color: C.textDim,
              fontSize: 12,
            }}
          >
            Smart supplier recommendations · No data yet
          </p>
        </div>

        {/* FILTERS — existing behavior retained */}
        <div
          style={{
            display: "flex",
            background: "#eee8e0",
            borderRadius: 10,
            padding: 4,
            gap: 2,
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

      {/* SUGGESTIONS AND OPPORTUNITY SUMMARY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 18,
          marginBottom: 22,
        }}
      >
        {/* TOP AI SUGGESTIONS */}
        <div style={cardStyle}>
          <h2
            style={{
              ...syne,
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
              margin: "0 0 22px",
            }}
          >
            Top AI Suggestions
          </h2>

          {primarySuggestions.map((item) => (
            <div
              key={item.title}
              style={{
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 5,
                }}
              >
                {item.title}
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: C.textMuted,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.reason}
              </p>
            </div>
          ))}
        </div>

        {/* OPPORTUNITY SUMMARY */}
        <div
          style={{
            ...cardStyle,
            background: C.cardGreen,
            borderColor: C.greenSubtle,
          }}
        >
          <h2
            style={{
              ...syne,
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
              margin: "0 0 22px",
            }}
          >
            Opportunity Summary
          </h2>

          {recommendationCards.map((card) => (
            <div
              key={card.title}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 0",
                borderBottom: `1px solid ${C.greenBorder}`,
                fontSize: 13,
                color: C.text,
              }}
            >
              <span>{card.title}</span>

              <strong
                style={{
                  ...syne,
                  fontSize: 16,
                  color: C.green,
                }}
              >
                {card.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* SUGGESTION TABLE */}
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
            Recommendation Overview
          </h2>

          <p style={{ fontSize: 12, color: C.textDim, margin: "6px 0 0" }}>
            AI-generated insights and their current status
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
              {["Area", "Suggestion", "Confidence", "Status"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {suggestionTable.map((row) => (
              <tr key={row.area}>
                <td style={tdStyle}>{row.area}</td>
                <td style={tdStyle}>{row.suggestion}</td>
                <td style={tdStyle}>{row.confidence}</td>
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
