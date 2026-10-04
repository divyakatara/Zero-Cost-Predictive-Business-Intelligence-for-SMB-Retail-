// Building blocks shared by the business and supplier Settings pages. Every
// value shown comes from the server; there are no placeholder fields.
import { useEffect, useState } from "react";
import { fetchJson, getAuthToken } from "./api";

const C = {
  card: "#ffffff",
  green: "#4a7a49",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
  bg: "#f5f2ec",
  danger: "#b8543f",
  dangerBg: "#fdf0f0",
};

const syne = { fontFamily: "Syne, sans-serif" };

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
        <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>{title}</h1>
      </div>
      <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>{subtitle}</p>
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: `1px solid ${active === tab ? C.green : C.border}`,
            background: active === tab ? C.green : C.card,
            color: active === tab ? "#fff" : C.textDim,
            fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function SettingsGrid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18, alignItems: "start" }}>
      {children}
    </div>
  );
}

export function SettingsCard({ title, subtitle, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 18 }}>
      <div style={{ ...syne, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.textDim, margin: "4px 0 0" }}>{subtitle}</div>}
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
}

export function SettingsRow({ label, value }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <span style={{ color: C.textMuted }}>{label}</span>
      <span style={{ color: empty ? C.textDim : C.text, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>
        {empty ? "Not provided" : value}
      </span>
    </div>
  );
}

export function Notice({ type = "error", children }) {
  const ok = type === "success";
  return (
    <div style={{
      background: ok ? C.greenSubtle : C.dangerBg, color: ok ? C.green : C.danger,
      border: `1px solid ${ok ? C.greenBorder : "#f0c8c0"}`, borderRadius: 8,
      padding: "10px 12px", fontSize: 12, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

// Claims from the signed-in user's token (display only; the server verifies it).
function readTokenClaims() {
  try {
    const payload = getAuthToken()?.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function AccountCard({ extraRows = null, onLogout }) {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const claims = readTokenClaims();
  const expiresAt = claims?.exp ? new Date(claims.exp * 1000) : null;

  useEffect(() => {
    fetchJson("/auth/me").then(setMe).catch(() => setError("Could not load your account details."));
  }, []);

  return (
    <SettingsCard title="Account" subtitle="The account you are signed in with">
      {error && <Notice>{error}</Notice>}
      <SettingsRow label="Name" value={me?.name} />
      <SettingsRow label="Login email" value={me?.email} />
      <SettingsRow label="Role" value={me?.role ? me.role[0].toUpperCase() + me.role.slice(1) : ""} />
      <SettingsRow label="GSTIN" value={me?.gstin} />
      {extraRows}
      <SettingsRow
        label="Session expires"
        value={expiresAt ? expiresAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
      />
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            marginTop: 18, padding: "10px 18px", background: "transparent", color: C.danger,
            border: `1px solid ${C.danger}`, borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          Log Out
        </button>
      )}
    </SettingsCard>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 14,
  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
  fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", boxSizing: "border-box",
};

export function ChangePasswordCard() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (form.next !== form.confirm) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetchJson("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      setMessage({ type: "success", text: res.message || "Password updated." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    ["current", "Current Password", "current-password"],
    ["next", "New Password (min 8 characters)", "new-password"],
    ["confirm", "Confirm New Password", "new-password"],
  ];

  return (
    <SettingsCard title="Change Password" subtitle="You will use the new password the next time you sign in">
      <form onSubmit={handleSubmit}>
        {message && <Notice type={message.type}>{message.text}</Notice>}
        {fields.map(([key, label, autoComplete]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 6 }}>{label}</label>
            <input type="password" required autoComplete={autoComplete} value={form[key]} onChange={update(key)} style={inputStyle} />
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 18px", background: C.green, color: "#fff", border: "none", borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {saving ? "Updating…" : "Update Password"}
        </button>
      </form>
    </SettingsCard>
  );
}

export function SecurityInfoCard() {
  return (
    <SettingsCard title="How your account is protected">
      <SettingsRow label="Password storage" value="Hashed with bcrypt" />
      <SettingsRow label="Authentication" value="Signed JWT, verified by the server" />
      <SettingsRow label="Session length" value="60 minutes" />
      <SettingsRow label="Sessions" value="Separate per browser tab" />
    </SettingsCard>
  );
}
