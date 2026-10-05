import { useEffect, useState } from "react";
import { fetchJson } from "./api";

const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  cardGreen: "#eef4ee",
  green: "#4a7a49",
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
  headerNote: "Smart suggestions to improve sales and business performance · Waiting for backend data",
  kpis: [],
  primarySuggestions: [],
};

const PRIORITY = {
  High: { bg: "#fdf0f0", color: "#8a2020", border: "#f0c8c0" },
  Medium: { bg: "#fdf8e8", color: "#8a7020", border: "#ecdca2" },
  Low: { bg: "#ffffff", color: "#4a7a49", border: "#c8d8c7" },
};

// Where each suggestion's "Open" button goes.
const TARGET = { Inventory: "Procurement AI", Sales: "Sales", Supplier: "Supplier Marketplace" };

export default function BAIInsightsPage({ onNavigate }) {
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/insights");
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyState);
          setError("Could not load AI insights from the backend.");
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ ...ibm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>AI Insights</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>{data.headerNote}</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {(data.kpis || []).map((kpi, index) => (
          <div key={kpi.label} style={{ background: index === 0 ? C.green : C.card, borderRadius: 12, padding: "22px 24px", border: index === 0 ? "none" : `1px solid ${C.border}`, boxShadow: index === 0 ? "0 4px 16px rgba(74,122,73,0.2)" : "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
            {index === 0 && <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: index === 0 ? "rgba(255,255,255,0.7)" : C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600 }}>{kpi.label}</span>
              <span style={{ fontSize: 18, color: index === 0 ? "rgba(255,255,255,0.8)" : C.textDim }}>+</span>
            </div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 700, color: index === 0 ? "#fff" : C.text, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: index === 0 ? "rgba(255,255,255,0.65)" : C.textDim, marginTop: 8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Top AI Suggestions</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Recommended actions based on your current stock, sales and suppliers</div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {(data.primarySuggestions || []).map((item) => {
            const tone = PRIORITY[item.priority] || PRIORITY.Low;
            const target = TARGET[item.subtitle];
            return (
              <div key={item.subtitle} style={{ background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{item.subtitle}</span>
                    <span style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>{item.priority} priority</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{item.impact}</span> · {item.reason}
                  </div>
                </div>
                {target && onNavigate && item.priority !== "Low" && (
                  <button
                    onClick={() => onNavigate(target)}
                    style={{ padding: "8px 14px", background: "#fff", color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {item.action} →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
