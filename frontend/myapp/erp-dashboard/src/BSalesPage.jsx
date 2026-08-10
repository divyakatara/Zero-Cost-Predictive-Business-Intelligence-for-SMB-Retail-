import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchJson, formatCurrency } from "./api";

const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  green: "#4a7a49",
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
const filters = ["All Time", "This Month", "This Week"];

const emptyState = {
  headerNote: "Overview, predictions & top products · Waiting for backend data",
  kpis: [],
  allTimeData: [],
  thisMonthData: [],
  thisWeekData: [],
  topProducts: [],
  topProductsChart: [],
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 160 }}>
        <p style={{ fontWeight: 700, color: C.textMuted, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
        {payload.map((item) => (
          <div key={item.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block" }} />
            <span style={{ fontSize: 13, color: C.textMuted }}>{item.dataKey === "actual" ? "Actual" : "Predicted"}:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ ...ibm, background: "#fff", border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <p style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 13, color: C.textMuted }}>
          Revenue: <span style={{ fontWeight: 700, color: C.green }}>{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function SalesPage() {
  const [filter, setFilter] = useState("All Time");
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/sales");
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyState);
          setError("Could not load sales data from the backend.");
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const chartData =
    filter === "All Time"
      ? data.allTimeData
      : filter === "This Month"
        ? data.thisMonthData
        : data.thisWeekData;

  return (
    <div style={{ ...ibm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Sales</h1>
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
              <span style={{ fontSize: 18, color: index === 0 ? "rgba(255,255,255,0.8)" : C.textDim }}>{index === 0 ? "$" : "+"}</span>
            </div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 700, color: index === 0 ? "#fff" : C.text, lineHeight: 1 }}>
              {typeof kpi.value === "number" && kpi.label !== "Total Orders" ? formatCurrency(kpi.value) : kpi.value}
            </div>
            <div style={{ fontSize: 12, color: index === 0 ? "rgba(255,255,255,0.65)" : C.textDim, marginTop: 8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15 }}>Sales Prediction</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Actual vs Predicted · {filter} · Hover over points for details</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[{ label: "Actual", color: C.green }, { label: "Predicted", color: C.greenMid }].map((legend) => (
              <div key={legend.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>
                <span style={{ width: 14, height: 2, background: legend.color, borderRadius: 2, display: "inline-block" }} />
                {legend.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActualSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradPredictedSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.greenMid} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.greenMid} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.greenBorder, strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area type="monotone" dataKey="actual" stroke={C.green} strokeWidth={2.5} fill="url(#gradActualSales)" dot={{ r: 4, fill: C.green, strokeWidth: 0 }} activeDot={{ r: 7, fill: C.green, stroke: "#fff", strokeWidth: 2 }} />
            <Area type="monotone" dataKey="predicted" stroke={C.greenMid} strokeWidth={2} strokeDasharray="5 4" fill="url(#gradPredictedSales)" dot={{ r: 4, fill: C.greenMid, strokeWidth: 0 }} activeDot={{ r: 7, fill: C.greenMid, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>Top Selling Products</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>Ranked by revenue · {filter}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(data.topProducts || []).map((product, index) => (
              <div key={product.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: C.greenSubtle, border: `1px solid ${C.greenBorder}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{product.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>{product.units} units sold</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatCurrency(product.revenue)}</div>
                  <div style={{ fontSize: 11, color: product.trend === "up" ? C.green : "#c83030", marginTop: 1, fontWeight: 500 }}>
                    {product.trend === "up" ? "Uptrend" : "Watch"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>Revenue by Product</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>Hover over bars for details · {filter}</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topProductsChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textDim, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: C.greenSubtle }} />
              <Bar dataKey="revenue" fill={C.green} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
