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
  warn: "#c8a030",
  warnBg: "#fdf8e8",
  danger: "#c83030",
  dangerBg: "#fdf0f0",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const filters = ["All", "High Risk", "Moderate Risk"];

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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default function SAlertsPage({ user }) {
  const supplierId = user?.supplier_id;
  const [filter, setFilter] = useState("All");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(supplierId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplierId) return undefined;
    let ignore = false;

    async function loadData() {
      setLoading(true);
      try {
        const response = await fetchJson(`/anomaly/suppliers/${encodeURIComponent(supplierId)}`);
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(null);
          setError("Could not load anomaly alerts from the backend.");
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

  // Same high/moderate cut-off as the business alerts page, provided by the backend.
  const threshold = data?.high_risk_threshold ?? -0.03;
  const isHighRisk = (a) => (a.anomaly_score ?? 0) < threshold;
  const anomalies = (data?.results || []).filter((a) =>
    filter === "All" ? true : filter === "High Risk" ? isHighRisk(a) : !isHighRisk(a)
  );
  const perProduct = Object.entries(data?.anomalies_per_product || {}).sort((a, b) => b[1] - a[1]);
  const mostAffected = perProduct.find(([, count]) => count > 0);

  const kpis = [
    { label: "Total Anomalies", value: data?.total_anomalies ?? "-", sub: "Unusual sales of your products" },
    { label: "High Risk", value: data?.high_risk ?? "-", sub: `Anomaly score below ${threshold}` },
    {
      label: "Products Affected",
      value: data ? perProduct.filter(([, count]) => count > 0).length : "-",
      sub: data ? `Out of ${data.product_codes.length} you supply` : "",
    },
    { label: "Most Affected", value: mostAffected ? mostAffected[0] : "-", sub: mostAffected ? `${mostAffected[1]} anomalies` : "No anomalies" },
  ];

  let notice = "";
  if (!supplierId) notice = "This account is not linked to a supplier record, so there are no products to monitor yet.";
  else if (error) notice = error;
  else if (loading) notice = "Loading anomaly alerts…";
  else if (data && data.product_codes.length === 0) notice = "No products are linked to this supplier yet, so there is nothing to monitor.";

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
            {data
              ? `Isolation Forest anomalies for ${data.supplier_name} (${data.supplier_code}) · ${data.product_codes.length} product(s) monitored`
              : "Isolation Forest anomalies for your products"}
          </p>
        </div>

        <div>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontWeight: filter === f ? 700 : 400 }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {notice}
        </div>
      )}

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

      {/* ALERTS BY PRODUCT */}
      {perProduct.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Alerts by Product</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {perProduct.map(([code, count]) => {
              const productRows = data.results.filter((a) => a.product_id === code);
              const high = productRows.filter(isHighRisk).length;
              const latest = productRows.map((a) => a.sale_date).sort().at(-1);
              return (
                <AlertCard
                  key={code}
                  tone={high > 0 ? "danger" : count > 0 ? "warn" : undefined}
                  item={{
                    title: code,
                    subtitle: "Product",
                    severity: high > 0 ? "High" : count > 0 ? "Moderate" : "None",
                    status: count > 0 ? `${count} anomalies` : "Normal",
                    note: count > 0 ? `${high} high risk · latest ${formatDate(latest)}` : "No unusual sales detected.",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* TABLE */}
      <table style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Branch</th>
            <th>Severity</th>
            <th>Why it was flagged</th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map(a => (
            <tr key={a.transaction_id}>
              <td>{formatDate(a.sale_date)}</td>
              <td>{a.product_id}</td>
              <td>{a.branch_id}</td>
              <td>{isHighRisk(a) ? "High" : "Moderate"} ({a.anomaly_score?.toFixed(3)})</td>
              <td>{a.explanation}</td>
            </tr>
          ))}
          {data && anomalies.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: C.textDim }}>No anomalies match this filter.</td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  );
}
