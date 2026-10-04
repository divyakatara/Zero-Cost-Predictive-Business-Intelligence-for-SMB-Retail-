import { useEffect, useRef, useState } from "react";
import { apiFetch, openGstCertificateApi } from "./api";
import {
  AccountCard, ChangePasswordCard, Notice, PageHeader, SecurityInfoCard,
  SettingsCard, SettingsGrid, SettingsRow, TabBar,
} from "./SettingsParts";

const C = {
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  danger:      "#b8543f",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const tabs = ["Business Profile", "Account", "Security", "Data"];

function formatDate(value) {
  if (!value) return "";
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function BusinessProfileTab({ business }) {
  const [certError, setCertError] = useState("");

  if (!business) {
    return <Notice>No business registration was found for this account.</Notice>;
  }

  const address = [business.addressLine1, business.addressLine2, business.city, business.state, business.pincode, business.country]
    .filter(Boolean)
    .join(", ");

  async function viewCertificate() {
    setCertError("");
    try {
      await openGstCertificateApi(business.id);
    } catch (err) {
      setCertError(err.message);
    }
  }

  return (
    <SettingsGrid>
      <div>
        <SettingsCard title="Business Details" subtitle="As submitted in your registration">
          <SettingsRow label="Business name" value={business.businessName} />
          <SettingsRow label="Type" value={business.businessType} />
          <SettingsRow label="Category" value={business.category} />
          <SettingsRow label="Year established" value={business.yearEstablished} />
          <SettingsRow label="Employees" value={business.employeeCount} />
          <SettingsRow label="Description" value={business.description} />
        </SettingsCard>
        <SettingsCard title="Contact">
          <SettingsRow label="Address" value={address} />
          <SettingsRow label="Phone" value={business.phone} />
          <SettingsRow label="Business email" value={business.email} />
          <SettingsRow label="Website" value={business.website} />
        </SettingsCard>
      </div>
      <SettingsCard title="Verification" subtitle="Reviewed by the Smart ERP administrator">
        {certError && <Notice>{certError}</Notice>}
        <SettingsRow
          label="Status"
          value={<span style={{ color: business.status === "approved" ? C.green : C.danger, textTransform: "capitalize" }}>● {business.status}</span>}
        />
        <SettingsRow label="Submitted" value={formatDate(business.submittedAt)} />
        <SettingsRow label="Reviewed" value={formatDate(business.reviewedAt)} />
        <SettingsRow label="Registration number" value={business.registrationNumber} />
        <SettingsRow label="GSTIN" value={business.gstin} />
        <SettingsRow label="PAN" value={business.pan} />
        <SettingsRow
          label="GST certificate"
          value={business.hasGstCertificateFile ? (
            <button
              onClick={viewCertificate}
              style={{
                background: C.greenSubtle, color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 6,
                padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              View {business.gstCertificateName}
            </button>
          ) : business.gstCertificateName || ""}
        />
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 14, lineHeight: 1.5 }}>
          To change these details, contact the administrator.
        </div>
      </SettingsCard>
    </SettingsGrid>
  );
}

function DataTab() {
  const fileInputRef = useRef(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [dataMsg, setDataMsg] = useState({ text: "", type: "" });
  const [dataLoading, setDataLoading] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchDataStatus();
  }, []);

  async function fetchDataStatus() {
    try {
      const [statusRes, historyRes] = await Promise.all([apiFetch(`/api/data/status`), apiFetch(`/api/data/history`)]);
      if (statusRes.ok) setDataStatus(await statusRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch { /* backend may be offline */ }
  }

  async function handleLoadDemo() {
    setDataLoading("demo");
    setDataMsg({ text: "", type: "" });
    try {
      const res = await apiFetch(`/api/data/load-demo`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setDataMsg({ text: `✓ Demo dataset loaded: ${body.sales_count} sales, ${body.products_count} products, ${body.suppliers_count} suppliers.`, type: "success" });
        await fetchDataStatus();
      } else {
        setDataMsg({ text: `Error: ${body.detail || "Could not load demo dataset."}`, type: "error" });
      }
    } catch {
      setDataMsg({ text: "Could not connect to backend. Is the server running?", type: "error" });
    } finally {
      setDataLoading("");
    }
  }

  async function handleClear() {
    if (!window.confirm("Clear all business data? This will reset your dashboard to the empty state.")) return;
    setDataLoading("clear");
    setDataMsg({ text: "", type: "" });
    try {
      const res = await apiFetch(`/api/data/clear`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setDataMsg({ text: "✓ All business data cleared. Dashboard will show empty state.", type: "warn" });
        await fetchDataStatus();
      } else {
        setDataMsg({ text: `Error: ${body.detail || "Could not clear data."}`, type: "error" });
      }
    } catch {
      setDataMsg({ text: "Could not connect to backend. Is the server running?", type: "error" });
    } finally {
      setDataLoading("");
    }
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDataLoading("import");
    setDataMsg({ text: "", type: "" });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch(`/api/data/import`, { method: "POST", body: formData });
      const body = await res.json();
      if (res.ok) {
        setDataMsg({ text: `✓ ${body.message}`, type: "success" });
        await fetchDataStatus();
      } else {
        setDataMsg({ text: `Validation failed: ${body.detail}`, type: "error" });
      }
    } catch {
      setDataMsg({ text: "Could not connect to backend. Is the server running?", type: "error" });
    } finally {
      setDataLoading("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
        <div style={{ display: "grid", gap: 18 }}>

          {/* Connection Status Banner */}
          <div style={{
            background: dataStatus?.connected ? C.greenSubtle : "#fff8ec",
            border: `1px solid ${dataStatus?.connected ? C.greenBorder : "#e8d8b0"}`,
            borderRadius: 12,
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: dataStatus?.connected ? C.green : "#c8a030",
                flexShrink: 0,
              }} />
              <div>
                <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text }}>
                  {dataStatus?.connected ? "Business Data Connected" : "No Business Data Connected"}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                  {dataStatus?.connected
                    ? `${dataStatus.sales_count?.toLocaleString()} sales · ${dataStatus.products_count} products · ${dataStatus.suppliers_count} suppliers — ${dataStatus.dataset_name}`
                    : "Upload an Excel/CSV dataset or load the demo workbook to activate your dashboards."}
                </div>
              </div>
            </div>
            <button onClick={fetchDataStatus} style={{ ...secondaryButtonStyle(), padding: "6px 12px", fontSize: 11 }}>
              ↻ Refresh
            </button>
          </div>

          {/* Feedback message */}
          {dataMsg.text && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              background: dataMsg.type === "success" ? C.greenSubtle : dataMsg.type === "warn" ? "#fff8ec" : "#fdf0f0",
              color: dataMsg.type === "success" ? C.green : dataMsg.type === "warn" ? "#8a6020" : "#b83030",
              border: `1px solid ${dataMsg.type === "success" ? C.greenBorder : dataMsg.type === "warn" ? "#e8d8b0" : "#f0c8c0"}`,
            }}>
              {dataMsg.text}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

            {/* Import / Upload */}
            <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Connect / Import Data</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>
                Upload your own Excel (.xlsx) or CSV dataset. Required columns: <code style={{ background: "#f0f6f0", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>sale_date</code>, <code style={{ background: "#f0f6f0", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>product_id</code>, <code style={{ background: "#f0f6f0", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>quantity_sold</code>, <code style={{ background: "#f0f6f0", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>sales_amount</code>.
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${C.greenBorder}`,
                  borderRadius: 10,
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: C.greenSubtle,
                  marginBottom: 16,
                  transition: "background .15s",
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Click to upload file</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Supports .xlsx · .xls · .csv</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                style={{ display: "none" }}
              />

              <button
                style={{ ...primaryButtonStyle(), width: "100%", opacity: dataLoading === "import" ? 0.7 : 1 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={dataLoading === "import"}
              >
                {dataLoading === "import" ? "Uploading & Validating..." : "📤 Upload & Import Dataset"}
              </button>
            </div>

            {/* Demo Dataset + Clear */}
            <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
              <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
                <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 6 }}>Demo Dataset</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                  Load the built-in <strong>Capstone ERP Workbook</strong> — 3,650 transactions, 10 products, 5 suppliers across 2 branches.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[["3,650", "Sales"], ["10", "Products"], ["5", "Suppliers"]].map(([v, l]) => (
                    <div key={l} style={{ background: "#fff", borderRadius: 8, padding: "10px", textAlign: "center", border: `1px solid ${C.greenBorder}` }}>
                      <div style={{ ...syne, fontSize: 18, fontWeight: 800, color: C.green }}>{v}</div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>

                <button
                  style={{ ...primaryButtonStyle(), width: "100%", opacity: dataLoading === "demo" ? 0.7 : 1 }}
                  onClick={handleLoadDemo}
                  disabled={dataLoading === "demo"}
                >
                  {dataLoading === "demo" ? "Loading Demo..." : "🗄️ Load Demo Dataset"}
                </button>
              </div>

              <div style={{ background: "#fdf8f8", borderRadius: 12, padding: "20px 24px", border: "1px solid #f0d8d8" }}>
                <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: "#8a3030", marginBottom: 6 }}>Clear Business Data</div>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 14, lineHeight: 1.5 }}>
                  Remove your business's sales, products and inventory to see the empty dashboard state. Other businesses and the supplier marketplace are not affected.
                </div>
                <button
                  style={{ padding: "9px 16px", background: "transparent", color: "#b83030", border: "1px solid #f0c8c0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: dataLoading === "clear" ? 0.7 : 1 }}
                  onClick={handleClear}
                  disabled={dataLoading === "clear"}
                >
                  {dataLoading === "clear" ? "Clearing..." : "🗑️ Clear Data (Test Empty State)"}
                </button>
              </div>
            </div>
          </div>

          {/* Import history (this business only) */}
          <div style={{ background: C.card, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
            <div style={{ ...syne, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Import History</div>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textDim }}>No files imported yet. Your data is the demo dataset or empty.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["File", "Sales rows", "Products", "Imported by", "When"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 4px", color: C.textDim, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ padding: "8px 4px", color: C.text }}>{h.filename}</td>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>{h.row_count.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>{h.products_count ?? "-"}</td>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>{h.imported_by || "-"}</td>
                      <td style={{ padding: "8px 4px", color: C.textMuted }}>{h.imported_at ? new Date(`${h.imported_at}Z`).toLocaleString("en-IN") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Column reference */}
          <div style={{ background: C.card, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
            <div style={{ ...syne, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Required Column Reference</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {["sale_date", "product_id", "quantity_sold", "sales_amount", "cost_price", "profit", "branch_id", "promo"].map(col => (
                <code key={col} style={{ background: C.greenSubtle, color: C.green, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{col}</code>
              ))}
            </div>
          </div>
        </div>
  );
}

export default function BSettingsPage({ business, onLogout }) {
  const [currentTab, setCurrentTab] = useState("Business Profile");

  return (
    <div style={{ ...ibm }}>
      <PageHeader title="Settings" subtitle="Your business profile, account, security and data" />
      <TabBar tabs={tabs} active={currentTab} onChange={setCurrentTab} />

      {currentTab === "Business Profile" && <BusinessProfileTab business={business} />}

      {currentTab === "Account" && (
        <SettingsGrid>
          <AccountCard onLogout={onLogout} />
        </SettingsGrid>
      )}

      {currentTab === "Security" && (
        <SettingsGrid>
          <ChangePasswordCard />
          <SecurityInfoCard />
        </SettingsGrid>
      )}

      {currentTab === "Data" && <DataTab />}
    </div>
  );
}

function primaryButtonStyle() {
  return {
    padding: "10px 16px",
    background: "#4a7a49",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  };
}

function secondaryButtonStyle() {
  return {
    padding: "10px 16px",
    background: "#fff",
    color: "#4a7a49",
    border: "1px solid #c8d8c7",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  };
}
