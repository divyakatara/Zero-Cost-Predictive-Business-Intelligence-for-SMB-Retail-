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
  warn: "#c8a030",
  warnBg: "#fdf8e8",
  danger: "#c83030",
  dangerBg: "#fdf0f0",
};

const syne = { fontFamily: "'Syne', sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

/* FILTERS */
const filters = ["All", "High Risk", "Moderate Risk"];

/* CARD STYLE */
const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 22,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

/* TABLE STYLES */
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

/* ALERT CARD */
function AlertCard({ item, tone = "normal" }) {
  const background =
    tone === "danger"
      ? C.dangerBg
      : tone === "warn"
        ? C.warnBg
        : C.greenSubtle;

  const borderColor =
    tone === "danger"
      ? "#f2bcbc"
      : tone === "warn"
        ? "#ecdca2"
        : C.greenBorder;

  const severityColor =
    tone === "danger"
      ? C.danger
      : tone === "warn"
        ? C.warn
        : C.textMuted;

  return (
    <div
      style={{
        ...ibm,
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "16px 18px",
        color: C.text,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              marginTop: 4,
            }}
          >
            {item.subtitle}
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: severityColor,
            whiteSpace: "nowrap",
          }}
        >
          {item.severity}
        </span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 4 }}>
        Status: <b>{item.status}</b>
      </div>

      <div
        style={{
          fontSize: 13,
          color: C.textMuted,
          lineHeight: 1.6,
        }}
      >
        {item.note}
      </div>
    </div>
  );
}

/* SECTION HEADING */
function SectionHeading({ children }) {
  return (
    <h2
      style={{
        ...syne,
        fontSize: 16,
        fontWeight: 700,
        color: C.text,
        margin: "24px 0 12px",
      }}
    >
      {children}
    </h2>
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
    { label: "Total Anomalies", value: data?.total_anomalies ?? "-", sub: "Unusual sales of your products", accent: true },
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
              Supplier Alerts
            </h1>
          </div>

          <p
            style={{
              margin: "8px 0 0 13px",
              color: C.textDim,
              fontSize: 12,
            }}
          >
            {data
              ? `Isolation Forest anomalies for ${data.supplier_name} (${data.supplier_code}) · ${data.product_codes.length} product(s) monitored`
              : "Isolation Forest anomalies for your products"}
          </p>
        </div>

        {/* RISK FILTERS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "#eee8e0",
            borderRadius: 10,
            padding: 4,
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
          marginBottom: 24,
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

      {/* ALERTS BY PRODUCT */}
      {perProduct.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeading>Alerts by Product</SectionHeading>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {perProduct.map(([code, count]) => {
              const productRows = data.results.filter((a) => a.product_id === code);
              const high = productRows.filter(isHighRisk).length;
              const latest = productRows.map((a) => a.sale_date).sort().at(-1);
              return (
                <AlertCard
                  key={code}
                  tone={high > 0 ? "danger" : count > 0 ? "warn" : "normal"}
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

      {/* ANOMALY TABLE */}
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
            Recent Anomalies
          </h2>

          <p style={{ fontSize: 12, color: C.textDim, margin: "6px 0 0" }}>
            Unusual sales of your products flagged by the Isolation Forest model, worst first
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
              {["Date", "Product", "Branch", "Severity", "Why it was flagged"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {anomalies.map((a) => (
              <tr key={a.transaction_id}>
                <td style={tdStyle}>{formatDate(a.sale_date)}</td>
                <td style={tdStyle}>{a.product_id}</td>
                <td style={tdStyle}>{a.branch_id}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 5,
                      background: isHighRisk(a) ? C.dangerBg : C.warnBg,
                      color: isHighRisk(a) ? C.danger : C.warn,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isHighRisk(a) ? "High" : "Moderate"} ({a.anomaly_score?.toFixed(3)})
                  </span>
                </td>
                <td style={{ ...tdStyle, color: C.textMuted }}>{a.explanation}</td>
              </tr>
            ))}

            {data && anomalies.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: C.textDim }}>
                  No anomalies match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
