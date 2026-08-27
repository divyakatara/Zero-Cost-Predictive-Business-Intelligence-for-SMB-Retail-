import { useState, useEffect } from "react";
import { getBusinesses, approveBusiness, rejectBusiness, revokeBusiness, subscribeBusinessChanges } from "./businessStore";
import ChatWidget from "./ChatWidget";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  sidebar:     "#2a2a2a",
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  sideBorder:  "#3a3a3a",
  sideMuted:   "#7a8a7a",
  sideDim:     "#4a5a4a",
  danger:      "#b8543f",
  dangerBg:    "#fdf0f0",
  amber:       "#a67a2e",
  amberBg:     "#fbf3e3",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const tabs = ["all", "pending", "approved", "rejected"];

function StatusBadge({ status }) {
  const map = {
    pending:  { bg: C.amberBg, color: C.amber, label: "Pending Review" },
    approved: { bg: C.greenSubtle, color: C.green, label: "Approved" },
    rejected: { bg: C.dangerBg, color: C.danger, label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20, padding: "4px 12px",
      fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
      border: `1px solid ${status === "approved" ? C.greenBorder : status === "rejected" ? "#f0c8c0" : "#ecdca2"}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

export default function AdminApprovalPage({ onLogout }) {
  const [businesses, setBusinesses] = useState([]);
  const [tab, setTab] = useState("pending");
  const [activeNav, setActiveNav] = useState("Approvals");
  const [rejectingEmail, setRejectingEmail] = useState(null);
  const [reason, setReason] = useState("");

  const refresh = () => setBusinesses(getBusinesses());

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeBusinessChanges(() => refresh());
    return () => unsubscribe();
  }, []);

  const handleApprove = (email) => {
    approveBusiness(email);
    refresh();
  };

  const handleRevoke = (email) => {
    revokeBusiness(email);
    refresh();
  };

  const handleRejectConfirm = (email) => {
    rejectBusiness(email, reason);
    setRejectingEmail(null);
    setReason("");
    refresh();
  };

  const openDocument = (docData, docName) => {
    if (!docData) {
      alert(`GST Certificate "${docName || "file"}" is recorded as uploaded.`);
      return;
    }
    const win = window.open();
    if (win) {
      if (docData.startsWith("data:application/pdf")) {
        win.document.write(`<iframe src="${docData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else if (docData.startsWith("data:image")) {
        win.document.write(`<img src="${docData}" style="max-width:100%; height:auto; margin:20px auto; display:block;" />`);
      } else {
        win.location.href = docData;
      }
    }
  };

  const totalCount = businesses.length;
  const pendingCount = businesses.filter((b) => b.status === "pending").length;
  const approvedCount = businesses.filter((b) => b.status === "approved").length;
  const rejectedCount = businesses.filter((b) => b.status === "rejected").length;

  const filtered = tab === "all" ? businesses : businesses.filter((b) => b.status === tab);

  return (
    <div style={{ ...ibm, background: C.bg, minHeight: "100vh", display: "flex", color: C.text }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 248, background: C.sidebar, display: "flex", flexDirection: "column",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh",
        borderRight: `1px solid ${C.sideBorder}`,
      }}>
        <div style={{ padding: "28px 24px 24px", borderBottom: `1px solid ${C.sideBorder}` }}>
          <div style={{ ...syne, fontWeight: 800, fontSize: 20, color: C.greenLight, letterSpacing: "1px" }}>
            SMART ERP
          </div>
          <div style={{ fontSize: 10, color: C.greenMid, marginTop: 4, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
            System Admin Portal
          </div>
        </div>

        <div style={{ padding: "18px 24px 8px" }}>
          <div style={{ fontSize: 10, color: C.sideDim, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 12 }}>
            Admin Management
          </div>

          {[
            { label: "Approvals", icon: "📋", badge: pendingCount ? `${pendingCount}` : null },
            { label: "System Overview", icon: "📊" },
          ].map((item) => {
            const active = activeNav === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "11px 16px", borderRadius: 8, marginBottom: 6,
                  background: active ? "#3a3a3a" : "transparent",
                  color: active ? C.greenLight : C.sideMuted,
                  border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: active ? 600 : 400, fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                {item.badge && (
                  <span style={{ background: C.amber, color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", padding: 24, borderTop: `1px solid ${C.sideBorder}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.greenLight }}>Administrator</div>
          <div style={{ fontSize: 11, color: C.sideMuted, marginTop: 2, marginBottom: 14 }}>admin@smarterp.com</div>
          <button
            onClick={onLogout || (() => window.location.reload())}
            style={{
              width: "100%", padding: "9px 12px", background: "transparent",
              color: C.danger, border: `1px solid #5a3a3a`, borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
              <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text }}>
                Business Approvals Dashboard
              </h1>
            </div>
            <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12 }}>
              Manual verification & approval queue for SMB retail onboarding
            </p>
          </div>
        </div>

        {/* Overview KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Total Registered</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.text }}>{totalCount}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Registered businesses</div>
          </div>
          <div style={{ background: C.amberBg, borderRadius: 12, padding: "20px 22px", border: `1px solid #ecdca2` }}>
            <div style={{ fontSize: 11, color: C.amber, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Pending Review</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.amber }}>{pendingCount}</div>
            <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>Awaiting admin action</div>
          </div>
          <div style={{ background: C.greenSubtle, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.greenBorder}` }}>
            <div style={{ fontSize: 11, color: C.green, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Approved</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.green }}>{approvedCount}</div>
            <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>Full ERP access unlocked</div>
          </div>
          <div style={{ background: C.dangerBg, borderRadius: 12, padding: "20px 22px", border: `1px solid #f0c8c0` }}>
            <div style={{ fontSize: 11, color: C.danger, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>Rejected</div>
            <div style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.danger }}>{rejectedCount}</div>
            <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>Registration declined</div>
          </div>
        </div>

        {/* Tabs Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, gap: 2 }}>
            {tabs.map((t) => {
              const count = t === "all" ? totalCount : businesses.filter((b) => b.status === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "8px 18px", borderRadius: 7, border: "none",
                    background: tab === t ? C.card : "transparent",
                    color: tab === t ? C.text : C.textDim,
                    fontWeight: tab === t ? 600 : 400, fontSize: 12, cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif", textTransform: "capitalize",
                    boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            background: C.card, borderRadius: 12, padding: "48px 24px", textAlign: "center",
            border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13,
          }}>
            No {tab} business registrations found in the queue.
          </div>
        )}

        {/* Approvals List */}
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map((b) => {
            const submittedDate = b.submittedAt ? new Date(b.submittedAt).toLocaleDateString("en-IN", {
              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
            }) : "Recently";

            return (
              <div key={b.userEmail || b.email} style={{
                background: C.card, borderRadius: 12, padding: "24px",
                border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ ...syne, fontSize: 18, fontWeight: 700, color: C.text }}>{b.businessName}</div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
                      Owner Email: <strong style={{ color: C.text }}>{b.userEmail || b.email}</strong> · Submitted: {submittedDate}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "14px 16px", background: C.bg, borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Business Type</span> <span style={{ color: C.text, fontWeight: 600 }}>{b.businessType || "—"}</span></div>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Category</span> <span style={{ color: C.text, fontWeight: 600 }}>{b.category || "—"}</span></div>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Reg Number</span> <span style={{ color: C.text, fontWeight: 600 }}>{b.registrationNumber || "—"}</span></div>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>GSTIN</span> <span style={{ color: C.text, fontWeight: 600 }}>{b.gstin || "Not provided"}</span></div>

                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Phone</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.phone || "—"}</span></div>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>City & State</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.city || "—"}, {b.state || "—"}</span></div>
                  <div><span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>PAN Number</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.pan || "—"}</span></div>
                  <div>
                    <span style={{ color: C.textDim, display: "block", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>GST Certificate</span>
                    {b.gstCertificateName ? (
                      <button
                        onClick={() => openDocument(b.gstCertificateData, b.gstCertificateName)}
                        style={{
                          background: C.greenSubtle, color: C.green, border: `1px solid ${C.greenBorder}`,
                          borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4,
                        }}
                      >
                        📄 View/Download PDF
                      </button>
                    ) : (
                      <span style={{ color: C.textDim, fontSize: 11 }}>Not uploaded</span>
                    )}
                  </div>
                </div>

                {b.status === "rejected" && b.rejectionReason && (
                  <div style={{ background: C.dangerBg, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14, border: "1px solid #f0c8c0" }}>
                    <strong>Rejection Reason:</strong> {b.rejectionReason}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  {b.status === "pending" && (
                    <>
                      {rejectingEmail === (b.userEmail || b.email) ? (
                        <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
                          <input
                            autoFocus
                            placeholder="Specify reason for rejection..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            style={{
                              flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                              background: C.bg, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                            }}
                          />
                          <button onClick={() => handleRejectConfirm(b.userEmail || b.email)} style={{
                            background: C.danger, color: "#fff", border: "none", borderRadius: 8,
                            padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>Confirm Reject</button>
                          <button onClick={() => { setRejectingEmail(null); setReason(""); }} style={{
                            background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 8,
                            padding: "9px 16px", fontSize: 12, cursor: "pointer",
                          }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setRejectingEmail(b.userEmail || b.email)} style={{
                            background: "transparent", color: C.danger, border: `1px solid #f0c8c0`, borderRadius: 8,
                            padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>Reject Business</button>
                          <button onClick={() => handleApprove(b.userEmail || b.email)} style={{
                            background: C.green, color: "#fff", border: "none", borderRadius: 8,
                            padding: "9px 22px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(74,122,73,0.2)",
                          }}>Approve & Activate Business</button>
                        </>
                      )}
                    </>
                  )}

                  {b.status === "approved" && (
                    <button onClick={() => handleRevoke(b.userEmail || b.email)} style={{
                      background: "transparent", color: C.danger, border: `1px solid #f0c8c0`, borderRadius: 8,
                      padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>Revoke Approval</button>
                  )}

                  {b.status === "rejected" && (
                    <button onClick={() => handleApprove(b.userEmail || b.email)} style={{
                      background: C.green, color: "#fff", border: "none", borderRadius: 8,
                      padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>Re-Approve Business</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Admin AI Assistant */}
      <ChatWidget role="admin" />
    </div>
  );
}