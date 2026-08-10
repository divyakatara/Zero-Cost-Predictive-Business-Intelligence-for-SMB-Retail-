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
  const [role,     setRole]     = useState("");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [gstin,    setGstin]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

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
    if (mode === "register" && ["business", "supplier"].includes(role) && !gstin) {
      setError("Please enter your GSTIN.");
      return;
    }

    try {
      setLoading(true);

      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const body = mode === "register"
        ? { name, email, password, role, gstin }
        : { email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Something went wrong. Please try again.");
        return;
      }

      onLogin(data.user);
    } catch (err) {
      setError("Could not connect to the backend. Make sure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setRole("");
    setName("");
    setEmail("");
    setPassword("");
    setGstin("");
  }

  return (
    <div style={{ ...ibm, minHeight: "100vh", background: C.bg, display: "flex" }}>

      {/* ── Left Panel ── */}
      <div style={{
        width: "42%", background: C.greenDeep, display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80,  right: -80, width: 300, height: 300, borderRadius: "50%", background: `${C.greenLight}10` }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: `${C.greenLight}08` }} />

        {/* Logo */}
        <div>
          <div style={{ ...syne, fontSize: 24, fontWeight: 800, color: C.greenLight, letterSpacing: "1px" }}>SMART ERP</div>
          <div style={{ fontSize: 11, color: "#4a5a4a", marginTop: 4, letterSpacing: "2.5px", textTransform: "uppercase" }}>AI-Driven Business Suite</div>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 3, background: C.greenLight, borderRadius: 2, marginBottom: 28, margin: "0 auto 28px" }} />
          <h2 style={{ ...syne, fontSize: 36, fontWeight: 800, color: "#ffffff", lineHeight: 1.2, marginBottom: 16 }}>
            Smarter business,<br />powered by AI.
          </h2>
          <p style={{ fontSize: 14, color: "#7a8a7a", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
            Manage inventory, predict demand, find suppliers, and get real-time insights - all in one place.
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { icon: "◉", label: "Business", desc: "Manage your operations" },
            { icon: "◉", label: "Supplier", desc: "Connect with buyers"    },
          ].map((r) => (
            <div key={r.label} style={{
              flex: 1, padding: "14px 16px",
              background: `${C.greenLight}10`,
              border: `1px solid ${C.greenLight}25`,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 18, color: C.greenLight, marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.greenLight }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "#4a5a4a", marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ ...syne, fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 14, color: C.textDim }}>
              {mode === "login" ? "Sign in to access your dashboard" : "Get started with SmartERP today"}
            </p>
          </div>

          {/* Toggle */}
          <div style={{ display: "flex", background: "#eee8e0", borderRadius: 10, padding: 4, marginBottom: 28 }}>
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

            {/* Role selector — register only */}
            {mode === "register" && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Account Type
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { value: "business", icon: "◉", label: "Business" },
                    { value: "supplier", icon: "◉", label: "Supplier" },
                  ].map((r) => (
                    <button type="button" key={r.value} onClick={() => setRole(r.value)} style={{
                      flex: 1, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                      border: role === r.value ? `2px solid ${C.green}` : `1px solid ${C.border}`,
                      background: role === r.value ? C.greenSubtle : C.card,
                      display: "flex", alignItems: "center", gap: 10,
                      fontFamily: "'IBM Plex Sans', sans-serif", transition: "all .15s",
                    }}>
                      <span style={{ fontSize: 20, color: role === r.value ? C.green : C.textDim }}>{r.icon}</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: role === r.value ? C.green : C.text }}>{r.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name — register only */}
            {mode === "register" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Full Name
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 14,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e  => e.target.style.borderColor = C.border}
                />
              </div>
            )}

            {/* GSTIN - required for business and supplier registration */}
            {mode === "register" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  GSTIN
                </label>
                <input
                  type="text" value={gstin} onChange={e => setGstin(e.target.value)}
                  placeholder="Enter your GSTIN"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 14,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e  => e.target.style.borderColor = C.border}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 9, fontSize: 14,
                  border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                  fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = C.green}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: "100%", padding: "11px 40px 11px 14px", borderRadius: 9, fontSize: 14,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e  => e.target.style.borderColor = C.border}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 16,
                }}>
                  {showPass ? "◎" : "◉"}
                </button>
              </div>
              {mode === "login" && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: C.green, cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div style={{ background: C.errorBg, border: "1px solid #f5c0c0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.error, marginBottom: 16 }}>
                ◬ {error}
              </div>
            )}

            {/* Submit button */}
            <button type="submit" style={{
              width: "100%", padding: "13px", background: C.green, color: "#fff",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
              boxShadow: "0 4px 16px rgba(74,122,73,0.3)", letterSpacing: "0.3px",
            }}
              onMouseEnter={e => e.target.style.opacity = 0.9}
              onMouseLeave={e => e.target.style.opacity = 1}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>

          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: C.textDim }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              style={{ color: C.green, fontWeight: 600, cursor: "pointer" }}
            >
              {mode === "login" ? "Register" : "Sign In"}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}
