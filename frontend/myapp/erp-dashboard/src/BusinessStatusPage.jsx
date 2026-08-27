const C = {
  bg: "#f5f2ec", card: "#ffffff",
  green: "#4a7a49", greenBorder: "#c8d8c7", greenSubtle: "#f0f6f0",
  text: "#1a1a1a", textMuted: "#5a6e5a", textDim: "#9aaa9a",
  border: "#e4ddd4", danger: "#b8543f", dangerBg: "#fdf0f0",
  amber: "#a67a2e", amberBg: "#fbf3e3",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

export default function BusinessStatusPage({ business, onRetry, onLogout }) {
  const isRejected = business?.status === "rejected";

  return (
    <div style={{ ...ibm, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: "48px 40px", maxWidth: 440,
        textAlign: "center", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: isRejected ? C.dangerBg : C.amberBg,
          color: isRejected ? C.danger : C.amber,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          margin: "0 auto 20px",
        }}>
          {isRejected ? "✕" : "⏳"}
        </div>

        <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          {isRejected ? "Registration Not Approved" : "Under Review"}
        </div>

        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
          {isRejected ? (
            <>
              <strong style={{ color: C.text }}>{business.businessName}</strong> could not be approved.
              {business.rejectionReason && (
                <div style={{ background: C.dangerBg, borderRadius: 8, padding: "10px 14px", marginTop: 12, color: C.danger, fontSize: 12 }}>
                  {business.rejectionReason}
                </div>
              )}
            </>
          ) : (
            <>
              Thanks for registering <strong style={{ color: C.text }}>{business?.businessName}</strong>.
              Our team is reviewing your details — this usually takes 1–2 business days.
              We'll notify you at {business?.email} once it's approved.
            </>
          )}
        </div>

        {isRejected && (
          <button onClick={onRetry} style={{
            background: C.green, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            width: "100%", marginBottom: 10,
          }}>
            Update Details & Resubmit
          </button>
        )}
        <button onClick={onLogout} style={{
          background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "12px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%",
        }}>
          Log Out
        </button>
      </div>
    </div>
  );
}
