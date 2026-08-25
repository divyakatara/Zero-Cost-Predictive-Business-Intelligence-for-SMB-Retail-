import { useState, useEffect } from "react";
import { getBusinesses, approveBusiness, rejectBusiness } from "./businessStore";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg: "#f5f2ec", card: "#ffffff", cardGreen: "#eef4ee",
  green: "#4a7a49", greenBorder: "#c8d8c7", greenSubtle: "#f0f6f0",
  text: "#1a1a1a", textMuted: "#5a6e5a", textDim: "#9aaa9a",
  border: "#e4ddd4", danger: "#b8543f", dangerBg: "#fdf0f0",
  amber: "#a67a2e", amberBg: "#fbf3e3",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const tabs = ["pending", "approved", "rejected"];

function StatusBadge({ status }) {
  const map = {
    pending: { bg: C.amberBg, color: C.amber, label: "Pending" },
    approved: { bg: C.greenSubtle, color: C.green, label: "Approved" },
    rejected: { bg: C.dangerBg, color: C.danger, label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20, padding: "4px 10px",
      fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

export default function AdminApprovalPage() {
  const [businesses, setBusinesses] = useState([]);
  const [tab, setTab] = useState("pending");
  const [rejectingEmail, setRejectingEmail] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setBusinesses(getBusinesses());
  }, []);

  const refresh = () => setBusinesses(getBusinesses());

  const handleApprove = (email) => {
    approveBusiness(email);
    refresh();
  };

  const handleRejectConfirm = (email) => {
    rejectBusiness(email, reason);
    setRejectingEmail(null);
    setReason("");
    refresh();
  };

  const filtered = businesses.filter((b) => b.status === tab);

  return (
    <div style={{ ...ibm, background: C.bg, minHeight: "100vh", padding: 40 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text }}>
              Business Approvals
            </h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12 }}>
            Review new business registrations before they go live
          </p>
        </div>

        <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, gap: 2, marginBottom: 24, width: "fit-content" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 18px", borderRadius: 7, border: "none",
              background: tab === t ? C.card : "transparent",
              color: tab === t ? C.text : C.textDim,
              fontWeight: tab === t ? 600 : 400, fontSize: 12, cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif", textTransform: "capitalize",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
              {t} ({businesses.filter((b) => b.status === t).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{
            background: C.card, borderRadius: 12, padding: "40px 24px", textAlign: "center",
            border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13,
          }}>
            No {tab} businesses right now.
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map((b) => (
            <div key={b.userEmail} style={{
              background: C.card, borderRadius: 12, padding: "22px 24px",
              border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ ...syne, fontSize: 17, fontWeight: 700, color: C.text }}>{b.businessName}</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{b.userEmail}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16, fontSize: 12 }}>
                <div><span style={{ color: C.textDim }}>Type:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.businessType || "—"}</span></div>
                <div><span style={{ color: C.textDim }}>Category:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.category || "—"}</span></div>
                <div><span style={{ color: C.textDim }}>Reg. No:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.registrationNumber || "—"}</span></div>
                <div><span style={{ color: C.textDim }}>City:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.city || "—"}, {b.state || "—"}</span></div>
                <div><span style={{ color: C.textDim }}>Phone:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.phone || "—"}</span></div>
                <div><span style={{ color: C.textDim }}>GSTIN:</span> <span style={{ color: C.text, fontWeight: 500 }}>{b.gstin || "—"}</span></div>
                <div>
                  <span style={{ color: C.textDim }}>GST Certificate:</span>{" "}
                  <span style={{ color: b.gstCertificateName ? C.green : C.text, fontWeight: 500 }}>
                    {b.gstCertificateName || "Not uploaded"}
                  </span>
                </div>
              </div>

              {b.status === "rejected" && b.rejectionReason && (
                <div style={{ background: C.dangerBg, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.danger, marginBottom: 14 }}>
                  Reason: {b.rejectionReason}
                </div>
              )}

              {b.status === "pending" && (
                <>
                  {rejectingEmail === b.userEmail ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        autoFocus
                        placeholder="Reason for rejection..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{
                          flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                          background: C.bg, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                        }}
                      />
                      <button onClick={() => handleRejectConfirm(b.userEmail)} style={{
                        background: C.danger, color: "#fff", border: "none", borderRadius: 8,
                        padding: "10px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Confirm</button>
                      <button onClick={() => { setRejectingEmail(null); setReason(""); }} style={{
                        background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 8,
                        padding: "10px 16px", fontSize: 12, cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleApprove(b.userEmail)} style={{
                        background: C.green, color: "#fff", border: "none", borderRadius: 8,
                        padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(74,122,73,0.2)",
                      }}>Approve</button>
                      <button onClick={() => setRejectingEmail(b.userEmail)} style={{
                        background: "transparent", color: C.danger, border: `1px solid #f0c8c0`, borderRadius: 8,
                        padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Reject</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}