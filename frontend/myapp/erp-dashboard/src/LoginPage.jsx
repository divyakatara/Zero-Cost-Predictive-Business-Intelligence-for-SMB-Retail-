import { useState } from "react";
import { API_BASE_URL } from "./api";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  greenDeep:   "#2a2a2a",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  error:       "#c83030",
  errorBg:     "#fdf0f0",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

export default function LoginPage({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [role,     setRole]     = useState("business");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "register" && !role) {
      setError("Please select your account type.");
      return;
    }
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "register" && !name) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      if (role === "admin") {
        // Attempt Admin Login API endpoint
        const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          const data = await res.json();
          onLogin({ ...data.user, mode });
          return;
        } else {
          // Check local env fallback if backend API offline
          if (email.toLowerCase() === "admin@smarterp.com" && password === "admin123") {
            onLogin({ name: "System Administrator", email, role: "admin", mode });
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Invalid admin credentials.");
        }
      }

      // Business or Supplier login/registration
      onLogin({ name: name || email.split("@")[0], email, role, mode });
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    if (newMode === "register" && role === "admin") {
      setRole("business");
    }
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <div style={{ ...ibm, minHeight: "100vh", background: C.bg, display: "flex" }}>

      {/* ── Left Panel ── */}
      <div style={{
        width: "42%", background: C.greenDeep, display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80,  right: -80, width: 300, height: 300, borderRadius: "50%", background: `${C.greenLight}10` }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: `${C.greenLight}08` }} />

        <div>
          <div style={{ ...syne, fontSize: 24, fontWeight: 800, color: C.greenLight, letterSpacing: "1px" }}>SMART ERP</div>
          <div style={{ fontSize: 11, color: "#4a5a4a", marginTop: 4, letterSpacing: "2.5px", textTransform: "uppercase" }}>AI-Driven Business Suite</div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 3, background: C.greenLight, borderRadius: 2, marginBottom: 28, margin: "0 auto 28px" }} />
          <h2 style={{ ...syne, fontSize: 36, fontWeight: 800, color: "#ffffff", lineHeight: 1.2, marginBottom: 16 }}>
            Smarter business,<br />powered by AI.
          </h2>
          <p style={{ fontSize: 14, color: "#7a8a7a", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
            Manage inventory, predict demand, find suppliers, and get real-time insights - all in one place.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {[
            { icon: "◉", label: "Business", desc: "Manage operations" },
            { icon: "◉", label: "Supplier", desc: "Connect with buyers" },
            { icon: "🛡", label: "Admin",    desc: "Review & approve" },
          ].map((r) => (
            <div key={r.label} style={{
              flex: 1, padding: "12px 14px",
              background: `${C.greenLight}10`,
              border: `1px solid ${C.greenLight}25`,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 16, color: C.greenLight, marginBottom: 4 }}>{r.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.greenLight }}>{r.label}</div>
              <div style={{ fontSize: 10, color: "#4a5a4a", marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 14, color: C.textDim }}>
              {mode === "login" ? "Sign in to access your ERP workspace" : "Get started with SmartERP today"}
            </p>
          </div>

          <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: "9px 0", borderRadius: 7, border: "none",
                background: mode === m ? C.card : "transparent",
                color: mode === m ? C.text : C.textDim,
                fontWeight: mode === m ? 600 : 400, fontSize: 13,
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all .15s",
              }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* Role selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                {mode === "login" ? "Sign In As" : "Account Type"}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { value: "business", icon: "◉", label: "Business" },
                  { value: "supplier", icon: "◉", label: "Supplier" },
                  ...(mode === "login" ? [{ value: "admin", icon: "🛡", label: "Admin" }] : []),
                ].map((r) => (
                  <button type="button" key={r.value} onClick={() => setRole(r.value)} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: role === r.value ? `2px solid ${C.green}` : `1px solid ${C.border}`,
                    background: role === r.value ? C.greenSubtle : C.card,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "'IBM Plex Sans', sans-serif", transition: "all .15s",
                  }}>
                    <span style={{ fontSize: 14, color: role === r.value ? C.green : C.textDim }}>{r.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: role === r.value ? C.green : C.text }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name — register only */}
            {mode === "register" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Full Name
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 13,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                {role === "admin" ? "Admin Email" : "Email"}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={role === "admin" ? "admin@smarterp.com" : "you@business.com"}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 13,
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%", padding: "11px 40px 11px 14px", borderRadius: 9, fontSize: 13,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 14,
                }}>
                  {showPass ? "◎" : "◉"}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ background: C.errorBg, border: "1px solid #f5c0c0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.error, marginBottom: 16 }}>
                ◬ {error}
              </div>
            )}

            {/* Submit button */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: C.green, color: "#fff",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
              boxShadow: "0 4px 16px rgba(74,122,73,0.3)", letterSpacing: "0.3px",
            }}>
              {loading ? "Authenticating..." : mode === "login" ? `Sign In as ${role.toUpperCase()} →` : "Create Account →"}
            </button>

          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: C.textDim }}>
            {mode === "login" ? "Need a business account? " : "Already registered? "}
            <span
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              style={{ color: C.green, fontWeight: 600, cursor: "pointer" }}
            >
              {mode === "login" ? "Register Business" : "Sign In"}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}