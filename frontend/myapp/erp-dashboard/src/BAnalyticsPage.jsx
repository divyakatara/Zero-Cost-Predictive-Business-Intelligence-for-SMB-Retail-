import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
const filters = ["All Time", "This Month", "This Week"];

const emptyState = {
  headerNote: "Operational breakdowns · Waiting for backend data",
  kpis: [],
  categoryData: [],
  demandData: [],
  accuracyData: [],
  matrixData: [],
  supplierData: [],
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <p style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 6 }}>{label}</p>
        {payload.map((item) => (
          <p key={item.dataKey} style={{ fontSize: 12, color: C.textMuted, margin: "2px 0" }}>
            {item.dataKey === "actual" ? "Actual" : item.dataKey === "predicted" ? "Predicted" : "Value"}: <span style={{ fontWeight: 700, color: C.text }}>{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BAnalyticsPage() {
  const [filter, setFilter] = useState("All Time");
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/analytics");
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyState);
          setError("Could not load analytics data from the backend.");
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
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Business Intelligence</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>{data.headerNote}</p>
        </div>
        <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, gap: 2 }}>
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                padding: "8px 16px",
                borderRadius: 7,
                border: "none",
                background: filter === item ? C.card : "transparent",
                color: filter === item ? C.text : C.textDim,
                fontWeight: filter === item ? 600 : 400,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                boxShadow: filter === item ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all .15s",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, marginBottom: 24 }}>
        <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Category Efficiency</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Category-wise movement · {filter}</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.categoryData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={C.green} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Demand Pattern</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Day-wise demand · Live retail sales data</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.demandData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={C.green} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Forecast Accuracy</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Predicted vs Actual · {filter}</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.accuracyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAccuracyLive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="actual" stroke={C.green} strokeWidth={2.5} fill="url(#gradAccuracyLive)" dot={{ r: 4, fill: C.green, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="predicted" stroke={C.green} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: C.green, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...syne, fontWeight: 700, color: C.green, fontSize: 15 }}>Product Matrix</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Movement & margin summary</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {(data.matrixData || []).map((item) => (
              <div key={item.name} style={{ background: "#fff", borderRadius: 10, padding: "14px", border: `1px solid ${C.greenBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.name}</div>
                  <span style={{ background: C.greenSubtle, color: C.green, borderRadius: 20, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>{item.margin}</span>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>{item.velocity}</div>
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Supplier Scorecard</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Reliability and efficiency summary · Live database data</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Supplier", "Category", "Fill Rate", "On-Time", "Variance", "Signal"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.supplierData || []).map((row) => (
              <tr key={row.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 600, color: C.text }}>{row.name}</td>
                <td style={{ padding: "14px 12px", fontSize: 12, color: C.textMuted }}>{row.category}</td>
                <td style={{ padding: "14px 12px", fontSize: 12, color: C.text }}>{row.fillRate}</td>
                <td style={{ padding: "14px 12px", fontSize: 12, color: C.text }}>{row.onTime}</td>
                <td style={{ padding: "14px 12px", fontSize: 12, color: C.textMuted }}>{row.variance}</td>
                <td style={{ padding: "14px 12px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.greenSubtle, color: C.green, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${C.greenBorder}` }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                    {row.signal}
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
