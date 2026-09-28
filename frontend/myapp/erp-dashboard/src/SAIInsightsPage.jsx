import { useEffect, useState } from "react";
import { fetchJson } from "./api";

// Load the fonts used by the supplier dashboard.
if (!document.querySelector("[data-supplier-insights-fonts]")) {
  const fontLink = document.createElement("link");
  fontLink.dataset.supplierInsightsFonts = "true";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
  fontLink.rel = "stylesheet";
  document.head.appendChild(fontLink);
}

const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  cardGreen: "#eef4ee",
  green: "#4a7a49",
  greenLight: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#7b8b7b",
  border: "#e4ddd4",
  red: "#a83232",
  redBg: "#fdf0f0",
  yellow: "#8a7020",
  yellowBg: "#fdf8e8",
};

const syne = {
  fontFamily: "Syne, sans-serif",
};

const ibm = {
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 22,
  boxSizing: "border-box",
};

const buttonStyle = {
  border: `1px solid ${C.border}`,
  background: C.card,
  color: C.text,
  borderRadius: 8,
  padding: "9px 14px",
  cursor: "pointer",
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
};

function getPriorityColor(priority) {
  const value = String(priority || "").toLowerCase();

  if (value.includes("high")) {
    return { color: C.red, background: C.redBg };
  }

  if (value.includes("medium")) {
    return { color: C.yellow, background: C.yellowBg };
  }

  return { color: C.green, background: C.greenSubtle };
}

function getStatusColor(status) {
  const value = String(status || "").toLowerCase();

  if (value === "critical" || value === "high" || value === "review") {
    return { color: C.red, background: C.redBg };
  }

  if (value === "low" || value === "medium") {
    return { color: C.yellow, background: C.yellowBg };
  }

  return { color: C.green, background: C.greenSubtle };
}

export default function SAIInsightsPage({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const supplierCode = user?.supplier_id || user?.supplier_code;

  useEffect(() => {
    let cancelled = false;

    async function loadInsights() {
      setLoading(true);
      setError("");
      setData(null);

      if (!supplierCode) {
        setError(
          "Your account is not linked to a supplier code. Link the account to a supplier record before loading insights."
        );
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          supplier_code: supplierCode,
        });

        const result = await fetchJson(
          `/business-pages/supplier-insights?${query.toString()}`
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load supplier insights. Check the backend connection and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, [supplierCode]);

  const kpis = data?.kpis || [];
  const suggestions = data?.primarySuggestions || [];
  const recommendations = data?.recommendationCards || [];
  const tableRows = data?.suggestionTable || [];
  const records = data?.records || [];

  return (
    <div
      style={{
        ...ibm,
        color: C.text,
        background: C.bg,
        minHeight: "100%",
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
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 3,
                height: 28,
                background: C.green,
                borderRadius: 2,
              }}
            />

            <h1
              style={{
                ...syne,
                fontSize: 26,
                fontWeight: 800,
                color: C.text,
                margin: 0,
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
            Insights based on your supplier records
          </p>

          {data?.supplierName && (
            <p
              style={{
                margin: "5px 0 0 13px",
                color: C.textMuted,
                fontSize: 12,
              }}
            >
              Supplier: {data.supplierName}
              {data.supplierCode ? ` · ${data.supplierCode}` : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setData(null);
            setError("");

            // Re-fetch using the same supplier-specific endpoint.
            setLoading(true);

            const query = new URLSearchParams({
              supplier_code: supplierCode || "",
            });

            fetchJson(
              `/business-pages/supplier-insights?${query.toString()}`
            )
              .then((result) => {
                setData(result);
              })
              .catch((err) => {
                setError(
                  err?.message || "Unable to refresh supplier insights."
                );
              })
              .finally(() => {
                setLoading(false);
              });
          }}
          disabled={loading || !supplierCode}
          style={{
            ...buttonStyle,
            opacity: loading || !supplierCode ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "↻ Refresh insights"}
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: 42,
            color: C.textMuted,
          }}
        >
          <div style={{ ...syne, fontSize: 18, marginBottom: 8 }}>
            Loading supplier insights
          </div>
          <div style={{ fontSize: 13 }}>
            Retrieving your supplier-specific database records...
          </div>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div
          role="alert"
          style={{
            ...cardStyle,
            borderColor: "#efc5c5",
            background: C.redBg,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              ...syne,
              margin: "0 0 8px",
              fontSize: 17,
              color: C.red,
            }}
          >
            Could not load insights
          </h3>

          <p
            style={{
              margin: "0 0 16px",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={buttonStyle}
          >
            Reload page
          </button>
        </div>
      )}

      {/* DATA-DRIVEN CONTENT */}
      {!loading && !error && data && (
        <>
          {/* DATABASE STATUS */}
          <div
            style={{
              background: C.greenSubtle,
              border: `1px solid ${C.greenLight}`,
              borderRadius: 9,
              padding: "12px 16px",
              marginBottom: 22,
              fontSize: 12,
              color: C.textMuted,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: C.green }}>Database status</strong>
            <div>{data.headerNote}</div>
          </div>

          {/* KPI CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 15,
              marginBottom: 24,
            }}
          >
            {kpis.map((kpi, index) => (
              <div
                key={kpi.label}
                style={{
                  background: index === 0 ? C.green : C.card,
                  color: index === 0 ? "#ffffff" : C.text,
                  borderRadius: 12,
                  padding: 20,
                  border:
                    index === 0
                      ? "1px solid transparent"
                      : `1px solid ${C.border}`,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0.9,
                    marginBottom: 12,
                  }}
                >
                  {kpi.label}
                </div>

                <div
                  style={{
                    ...syne,
                    fontSize: 28,
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                    marginBottom: 8,
                  }}
                >
                  {kpi.value}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.5,
                    opacity: 0.85,
                  }}
                >
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>

          {/* SUGGESTIONS AND OPPORTUNITIES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
              marginBottom: 22,
            }}
          >
            {/* SUGGESTIONS */}
            <section style={cardStyle}>
              <h2
                style={{
                  ...syne,
                  fontSize: 17,
                  margin: "0 0 18px",
                }}
              >
                Supplier Recommendations
              </h2>

              {suggestions.length > 0 ? (
                suggestions.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    style={{
                      padding: "15px 0",
                      borderTop:
                        index === 0 ? "none" : `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {item.title}
                      </strong>

                      <span
                        style={{
                          ...getPriorityColor(item.priority),
                          borderRadius: 5,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: 11,
                        marginTop: 6,
                      }}
                    >
                      {item.subtitle} · {item.impact}
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: C.textMuted,
                        margin: "10px 0",
                      }}
                    >
                      {item.reason}
                    </p>

                    <div
                      style={{
                        background: C.greenSubtle,
                        borderRadius: 7,
                        padding: "10px 12px",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Suggested action: </strong>
                      {item.action}
                    </div>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  No recommendations can be calculated from the currently
                  linked supplier records.
                </p>
              )}
            </section>

            {/* OPPORTUNITIES */}
            <section
              style={{
                ...cardStyle,
                background: C.cardGreen,
              }}
            >
              <h2
                style={{
                  ...syne,
                  fontSize: 17,
                  margin: "0 0 18px",
                }}
              >
                Supplier Overview
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {recommendations.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      background: C.card,
                      border: `1px solid ${C.greenLight}`,
                      borderRadius: 9,
                      padding: 15,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.note}
                      </div>
                    </div>

                    <div
                      style={{
                        ...syne,
                        fontSize: 22,
                        fontWeight: 800,
                        color: C.green,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SUPPLIER STOCK RECORDS */}
          <section
            style={{
              ...cardStyle,
              marginBottom: 22,
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                ...syne,
                fontSize: 17,
                margin: "0 0 6px",
              }}
            >
              Stock Records Used for Insights
            </h2>

            <p
              style={{
                color: C.textMuted,
                fontSize: 12,
                lineHeight: 1.6,
                margin: "0 0 18px",
              }}
            >
              These records show which database values are used to generate
              the supplier recommendations.
            </p>

            {records.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: 650,
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {[
                        "Product",
                        "Stock",
                        "Reorder Level",
                        "Risk Score",
                        "Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "12px 10px",
                            color: C.textDim,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.7px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, index) => (
                      <tr
                        key={`${record.productCode}-${record.branch}-${index}`}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "13px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {record.productName || record.productCode || "—"}
                        </td>

                        <td style={{ padding: "13px 10px", fontSize: 12 }}>
                          {record.stock ?? "N/A"}
                        </td>

                        <td style={{ padding: "13px 10px", fontSize: 12 }}>
                          {record.reorderLevel ?? "N/A"}
                        </td>

                        <td style={{ padding: "13px 10px", fontSize: 12 }}>
                          {record.riskScore ?? "N/A"}
                        </td>

                        <td style={{ padding: "13px 10px" }}>
                          <span
                            style={{
                              ...getStatusColor(record.status),
                              borderRadius: 5,
                              padding: "5px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p
                style={{
                  color: C.textMuted,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                The supplier is linked, but no stock records are currently
                available for analysis.
              </p>
            )}
          </section>

          {/* RECOMMENDATION TABLE */}
          <section
            style={{
              ...cardStyle,
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                ...syne,
                fontSize: 17,
                margin: "0 0 18px",
              }}
            >
              Recommendation Summary
            </h2>

            {tableRows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: 500,
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {["Area", "Suggested Action", "Priority", "Status"].map(
                        (heading) => (
                          <th
                            key={heading}
                            style={{
                              padding: "12px 10px",
                              fontSize: 10,
                              color: C.textDim,
                              textTransform: "uppercase",
                              letterSpacing: "0.7px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {tableRows.map((row, index) => (
                      <tr
                        key={`${row.area}-${index}`}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {row.area}
                        </td>

                        <td
                          style={{
                            padding: "14px 10px",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          {row.suggestion}
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              ...getPriorityColor(row.priority),
                              padding: "5px 8px",
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {row.priority}
                          </span>
                        </td>

                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              ...getStatusColor(row.status),
                              padding: "5px 8px",
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 700,
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
            ) : (
              <p
                style={{
                  color: C.textMuted,
                  fontSize: 13,
                }}
              >
                There are no recommendation rows to display.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
