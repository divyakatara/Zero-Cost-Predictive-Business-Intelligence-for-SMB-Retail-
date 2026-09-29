import { useEffect, useState } from "react";
import { fetchJson } from "./api";

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

const emptyState = {
  headerNote: "Smart supplier recommendations · Waiting for backend data",
  kpis: [],
  primarySuggestions: [],
  recommendationCards: [],
  suggestionTable: [],
};

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

export default function SAIInsightsPage({ user }) {
  const supplierId = user?.supplier_id;
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(Boolean(supplierId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplierId) return undefined;
    let ignore = false;

    async function loadData() {
      setLoading(true);
      try {
        const response = await fetchJson(`/suppliers/${encodeURIComponent(supplierId)}/insights`);
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyState);
          setError("Could not load supplier insights from the backend.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [supplierId]);

  const notice = !supplierId
    ? "This account is not linked to a supplier record, so there is no supplier data to analyse yet."
    : error || (loading ? "Loading supplier insights…" : "");

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
      <div style={{ marginBottom: 28 }}>
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
          {data.headerNote}
        </p>
      </div>

      {notice && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.textMuted,
            fontSize: 13,
          }}
        >
          {notice}
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
        {data.kpis.map((kpi, index) => {
          const accent = index === 0;
          return (
            <div
              key={kpi.label}
              style={{
                background: accent ? C.green : C.card,
                borderRadius: 12,
                padding: "22px 20px",
                border: accent ? "none" : `1px solid ${C.border}`,
                boxShadow: accent
                  ? "0 4px 16px rgba(74,122,73,0.15)"
                  : "0 1px 4px rgba(0,0,0,0.04)",
                color: accent ? "#fff" : C.text,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: accent ? "rgba(255,255,255,0.75)" : C.textDim,
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
                  color: accent ? "#fff" : C.text,
                }}
              >
                {kpi.value}
              </div>

              <div
                style={{
                  fontSize: 12,
                  marginTop: 7,
                  color: accent ? "rgba(255,255,255,0.7)" : C.textDim,
                }}
              >
                {kpi.sub}
              </div>
            </div>
          );
        })}
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

          {data.primarySuggestions.map((item) => (
            <div
              key={item.subtitle}
              style={{
                marginBottom: 18,
                paddingBottom: 14,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: C.textDim,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {item.subtitle} · {item.priority}
              </div>

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

              <div style={{ fontSize: 12, color: C.green, marginTop: 6 }}>
                {item.action} · {item.impact}
              </div>
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

          {data.recommendationCards.map((card) => (
            <div
              key={card.title}
              style={{
                padding: "12px 0",
                borderBottom: `1px solid ${C.greenBorder}`,
                fontSize: 13,
                color: C.text,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
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

              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{card.note}</div>
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
            AI-generated insights and the data signal behind each one
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
              {["Area", "Suggestion", "Signal", "Status"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.suggestionTable.map((row) => (
              <tr key={row.area}>
                <td style={tdStyle}>{row.area}</td>
                <td style={tdStyle}>{row.suggestion}</td>
                <td style={tdStyle}>{row.signal}</td>
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
