import { useCallback, useEffect, useState } from "react";
import { fetchJson, formatCurrency } from "./api";

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
  warn: "#c8a030",
  warnBg: "#fdf8e8",
  danger: "#c83030",
  dangerBg: "#fdf0f0",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };
const filters = ["All", "High Risk", "Moderate Risk"];

// Same severity tones the anomaly rows below use.
const severityTone = {
  High: { bg: "#fdf0f0", color: "#c83030", border: "#f2bcbc" },
  Medium: { bg: "#fdf8e8", color: "#c8a030", border: "#ecdca2" },
  Low: { bg: "#f0f6f0", color: "#4a7a49", border: "#c8d8c7" },
};

export default function BAlertsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState("");
  // Stock and supplier alerts from /business-pages/alerts. Kept in their own
  // state so a failure here can never take down the anomaly results below.
  const [operational, setOperational] = useState(null);
  const [operationalError, setOperationalError] = useState("");

  const loadOperationalAlerts = useCallback(async () => {
    try {
      setOperational(await fetchJson("/business-pages/alerts"));
      setOperationalError("");
    } catch {
      setOperational(null);
      setOperationalError("Could not load stock and supplier alerts from the backend.");
    }
  }, []);

  const loadData = useCallback(async (refresh = false) => {
    setLoading(true);
    setRetraining(refresh);
    setError("");
    loadOperationalAlerts();  // deliberately not awaited: independent of the model
    try {
      // Retrain once (via the summary call), then read the fresh results.
      const sumRes = await fetchJson(`/anomaly/summary${refresh ? "?refresh=true" : ""}`);
      const anoRes = await fetchJson("/anomaly/anomalies?limit=200");
      setSummary(sumRes);
      setAnomalies(anoRes.results || []);
    } catch (err) {
      setError(err.message || "Failed to load anomaly detection data from Isolation Forest model.");
    } finally {
      setLoading(false);
      setRetraining(false);
    }
  }, [loadOperationalAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAnomalies = anomalies.filter((item) => {
    // Filter by risk severity based on score (more negative = higher risk)
    if (filter === "High Risk" && (item.anomaly_score === undefined || item.anomaly_score >= -0.03)) {
      return false;
    }
    if (filter === "Moderate Risk" && (item.anomaly_score === undefined || item.anomaly_score < -0.03)) {
      return false;
    }

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      const matchTx = (item.transaction_id || "").toString().toLowerCase().includes(q);
      const matchProd = (item.product_id || "").toString().toLowerCase().includes(q);
      const matchBranch = (item.branch_id || "").toString().toLowerCase().includes(q);
      const matchExp = (item.explanation || "").toLowerCase().includes(q);
      return matchTx || matchProd || matchBranch || matchExp;
    }
    return true;
  });

  const formatDate = (val) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(val);
    }
  };

  return (
    <div style={{ ...ibm }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>
              Error & Anomaly Detection
            </h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
            {summary
              ? `Isolation Forest · ${summary.model_params?.n_estimators} estimators · ${(summary.contamination_rate * 100).toFixed(1)}% contamination · ${summary.total_rows?.toLocaleString("en-IN")} records analysed`
              : "Isolation Forest anomaly detection over the transaction history"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${C.greenBorder}`,
              background: C.greenSubtle,
              color: C.green,
              fontWeight: 600,
              fontSize: 12,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {retraining ? "Retraining…" : loading ? "Loading…" : "Retrain & Refresh ML Model"}
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            background: C.dangerBg,
            border: `1px solid #f2bcbc`,
            borderRadius: 10,
            color: C.danger,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => loadData()}
            style={{
              padding: "4px 10px",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !summary && (
        <div
          style={{
            padding: "60px 0",
            textAlign: "center",
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            color: C.textMuted,
          }}
        >
          <div style={{ ...syne, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Running Isolation Forest Error Detection...
          </div>
          <div style={{ fontSize: 12, color: C.textDim }}>Evaluating transaction features across 10 dimensions</div>
        </div>
      )}

      {/* SUMMARY KPIS */}
      {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                background: C.green,
                borderRadius: 12,
                padding: "22px 24px",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(74,122,73,0.2)",
              }}
            >
              <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                Potential Anomalies
              </div>
              <div style={{ ...syne, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{summary.total_anomalies}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 8 }}>
                Flagged for business review
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "22px 24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                Contamination Rate
              </div>
              <div style={{ ...syne, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {(summary.contamination_rate * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>Target contamination threshold</div>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "22px 24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                Total Evaluated
              </div>
              <div style={{ ...syne, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {summary.total_rows?.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>Transaction sheet rows</div>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "22px 24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                Normal Rows
              </div>
              <div style={{ ...syne, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {summary.normal_rows?.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
                {summary.total_rows ? ((summary.normal_rows / summary.total_rows) * 100).toFixed(1) : 0}% standard transactions
              </div>
            </div>
          </div>

          {/* DISTRIBUTION BREAKDOWN */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: "22px", border: `1px solid ${C.border}` }}>
              <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>
                Top Anomalies by Product
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 14 }}>Products with highest count of flag signals</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(summary.anomalies_per_product || {}).slice(0, 6).map(([prod, cnt]) => (
                  <div
                    key={prod}
                    style={{
                      background: C.warnBg,
                      border: `1px solid #ecdca2`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: C.text }}>{prod}</span>
                    <span style={{ background: C.warn, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                      {cnt} anomalies
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "22px", border: `1px solid ${C.border}` }}>
              <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>
                Top Anomalies by Branch
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 14 }}>Branch locations needing error inspection</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(summary.anomalies_per_branch || {}).slice(0, 6).map(([branch, cnt]) => (
                  <div
                    key={branch}
                    style={{
                      background: C.greenSubtle,
                      border: `1px solid ${C.greenBorder}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: C.text }}>{branch}</span>
                    <span style={{ background: C.green, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                      {cnt} anomalies
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* STOCK & SUPPLIER ALERTS — /business-pages/alerts */}
      <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 16 }}>Stock &amp; Supplier Alerts</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
            {operational
              ? `${operational.recentTable.length} current attention point(s) from your stock levels, revenue trend and supplier risk`
              : "Current attention points from your stock levels, revenue trend and supplier risk"}
          </div>
        </div>

        {operationalError && (
          <div style={{ padding: "12px 16px", background: C.dangerBg, border: "1px solid #f2bcbc", borderRadius: 10, color: C.danger, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>{operationalError}</span>
            <button
              onClick={loadOperationalAlerts}
              style={{ padding: "4px 10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Retry
            </button>
          </div>
        )}

        {!operational && !operationalError && (
          <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: C.textDim }}>
            Loading stock and supplier alerts…
          </div>
        )}

        {operational && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#faf7f2" }}>
                {["Type", "Alert", "Severity", "Status"].map((heading) => (
                  <th key={heading} style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operational.recentTable.map((row) => {
                const tone = severityTone[row.severity] || severityTone.Low;
                return (
                  <tr key={`${row.type}-${row.alert}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 10px", color: C.textMuted }}>{row.type}</td>
                    <td style={{ padding: "12px 10px", fontWeight: 600, color: C.text }}>{row.alert}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                        {row.severity}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: row.status === "Open" ? C.text : C.textDim }}>{row.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ANOMALY LOG TABLE */}
      <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 16 }}>Detected Anomaly Records</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
              Showing {filteredAnomalies.length} of {anomalies.length} anomaly transactions scored by Isolation Forest
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search ID, Product, Branch, Reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: 12,
                width: 240,
                outline: "none",
                fontFamily: "'IBM Plex Sans', sans-serif",
                background: C.bg,
                color: C.text,
              }}
            />

            <div style={{ display: "flex", background: "#eee8e0", borderRadius: 8, padding: 3, gap: 2 }}>
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: filter === item ? C.card : "transparent",
                    color: filter === item ? C.text : C.textDim,
                    fontWeight: filter === item ? 600 : 400,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#faf7f2" }}>
                <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Transaction ID</th>
                <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Date</th>
                <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Product</th>
                <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Branch</th>
                <th style={{ textAlign: "right", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Sales Amount</th>
                <th style={{ textAlign: "right", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Stock</th>
                <th style={{ textAlign: "right", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}>Profit</th>
                <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", minWidth: 260 }}>Explanation / Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: C.textDim }}>
                    {loading ? "Loading anomalies..." : "No anomaly records match the selected filter."}
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((row, idx) => {
                  const score = row.anomaly_score ?? 0;
                  const isHigh = score < -0.03;
                  return (
                    <tr
                      key={row.transaction_id || idx}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: isHigh ? "rgba(200, 48, 48, 0.02)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 10px", fontWeight: 700, color: C.text }}>
                        {row.transaction_id || `TX-${idx + 1}`}
                      </td>
                      <td style={{ padding: "12px 10px", color: C.textMuted }}>
                        {formatDate(row.sale_date)}
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: 600, color: C.text }}>
                        {row.product_id || "-"}
                      </td>
                      <td style={{ padding: "12px 10px", color: C.textMuted }}>
                        {row.branch_id || "-"}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 600 }}>
                        {row.quantity_sold ?? row.quantity ?? 0}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 600, color: C.green }}>
                        {formatCurrency(row.sales_amount ?? row.sales ?? 0)}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right", color: (row.current_stock ?? 0) <= (row.reorder_level ?? 0) ? C.danger : C.text }}>
                        {row.current_stock ?? 0}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right", color: (row.profit ?? 0) < 0 ? C.danger : C.text }}>
                        {formatCurrency(row.profit ?? 0)}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                background: isHigh ? C.dangerBg : C.warnBg,
                                color: isHigh ? C.danger : C.warn,
                                border: `1px solid ${isHigh ? "#f2bcbc" : "#ecdca2"}`,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Score: {score.toFixed(4)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                            {row.explanation || "Deviating multivariable feature values detected."}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
