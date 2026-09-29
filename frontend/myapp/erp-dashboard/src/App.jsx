import { useState, useEffect, useCallback } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import { getBusinessByEmail, submitBusiness, subscribeBusinessChanges } from "./businessStore";
import { fetchJson, getAuthToken, setAuthToken } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  // "idle" | "needs-register" | "has-record"
  const [bizState, setBizState] = useState("idle");
  const [businessRecord, setBusinessRecord] = useState(null);

  // Keep business record in sync with cross-tab changes
  const syncBusiness = useCallback((email) => {
    if (!email) return null;
    const rec = getBusinessByEmail(email);
    setBusinessRecord(rec || null);
    return rec;
  }, []);

  // Restore a saved session only after the backend validates its JWT and role.
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!getAuthToken()) {
        if (!cancelled) setAuthChecking(false);
        return;
      }
      try {
        const session = await fetchJson("/auth/me");
        if (!session?.role || !["admin", "business", "supplier"].includes(session.role)) {
          throw new Error("Invalid session role.");
        }
        if (!cancelled) applyVerifiedSession({ ...session, mode: "login" });
      } catch {
        setAuthToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // Real-time subscription for cross-tab approvals
  useEffect(() => {
    const unsubscribe = subscribeBusinessChanges(() => {
      if (user?.role === "business") {
        syncBusiness(user.email);
      }
    });
    return () => unsubscribe();
  }, [user, syncBusiness]);

  // Only use identity and role returned by the backend's token-verified session.
  function applyVerifiedSession(userData) {
    setUser(userData);

    if (userData.role === "business") {
      const existing = getBusinessByEmail(userData.email);
      if (userData.mode === "register") {
        setBusinessRecord(null);
        setBizState("needs-register");
      } else if (existing) {
        setBusinessRecord(existing);
        setBizState("has-record");
      } else {
        setBusinessRecord(null);
        setBizState("needs-register");
      }
    } else {
      setBusinessRecord(null);
      setBizState("idle");
    }
  }

  async function handleLogin(loginResponseUser) {
    try {
      // Re-check the token with the server instead of trusting client-supplied role data.
      const verifiedSession = await fetchJson("/auth/me");
      if (
        !verifiedSession?.role ||
        !["admin", "business", "supplier"].includes(verifiedSession.role) ||
        verifiedSession.role !== loginResponseUser.role
      ) {
        throw new Error("The server could not verify this user session.");
      }
      applyVerifiedSession({ ...verifiedSession, mode: loginResponseUser.mode || "login" });
    } catch {
      setAuthToken(null);
      setUser(null);
      setBizState("idle");
      setBusinessRecord(null);
      throw new Error("Unable to verify your session. Please sign in again.");
    }
  }

  function handleBusinessDetailsSubmit(businessData) {
    if (!user) return;
    const record = submitBusiness(user.email, businessData);
    setBusinessRecord(record);
    setBizState("has-record");
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
    setBizState("idle");
    setBusinessRecord(null);
  }

  // ── Routing ──────────────────────────────────────────────

  if (authChecking) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Checking your session...</div>;
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (user.role === "admin") {
    return <AdminApprovalPage onLogout={handleLogout} />;
  }

  if (user.role === "business") {
    if (bizState === "needs-register") {
      return (
        <BRegisterBusinessPage
          user={user}
          onSubmit={handleBusinessDetailsSubmit}
          onBack={handleLogout}
        />
      );
    }

    if (bizState === "has-record" && businessRecord) {
      return (
        <BusinessDashboard
          business={businessRecord}
          onLogout={handleLogout}
        />
      );
    }

    // Fallback: still loading or unknown state → show registration
    return (
      <BRegisterBusinessPage
        user={user}
        onSubmit={handleBusinessDetailsSubmit}
        onBack={handleLogout}
      />
    );
  }

  if (user.role === "supplier") {
    return <SupplierDashboard user={user} />;
  }
}
