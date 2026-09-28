import { useEffect, useState } from "react";
import { fetchJson } from "./api";

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

const emptyState = {
  headerNote: "Smart supplier recommendations · Waiting for backend data",
  kpis: [],
  primarySuggestions: [],
  recommendationCards: [],
  suggestionTable: [],
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
    <div style={{ ...ibm }}>

      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 28, background: C.green }}></div>
          <h1 style={{ ...syne, fontSize: 26, fontWeight: 800 }}>
            Supplier AI Insights
          </h1>
        </div>
        <p style={{ marginLeft: 13, color: C.textDim, fontSize: 12 }}>
          {data.headerNote}
        </p>
      </div>

      {notice && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {notice}
        </div>
      )}

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {data.kpis.map((kpi, index) => (
          <div key={kpi.label} style={{
            background: index === 0 ? C.green : C.card,
            padding: 20,
            borderRadius: 12,
            color: index === 0 ? "#fff" : C.text
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
          {data.primarySuggestions.map((item) => (
            <div key={item.subtitle} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>
                {item.subtitle} · {item.priority}
              </div>
              <b>{item.title}</b>
              <p style={{ margin: "4px 0", color: C.textMuted, fontSize: 13 }}>{item.reason}</p>
              <div style={{ fontSize: 12, color: C.green }}>{item.action} · {item.impact}</div>
            </div>
          ))}
        </div>

        {/* OPPORTUNITIES */}
        <div style={{ background: C.cardGreen, padding: 24, borderRadius: 12 }}>
          <h3>Opportunity Summary</h3>
          {data.recommendationCards.map(card => (
            <div key={card.title} style={{ marginBottom: 12 }}>
              <div>{card.title}: <b>{card.value}</b></div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{card.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div style={{ marginTop: 20 }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {["Area", "Suggestion", "Signal", "Status"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.suggestionTable.map(row => (
              <tr key={row.area}>
                <td>{row.area}</td>
                <td>{row.suggestion}</td>
                <td>{row.signal}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
