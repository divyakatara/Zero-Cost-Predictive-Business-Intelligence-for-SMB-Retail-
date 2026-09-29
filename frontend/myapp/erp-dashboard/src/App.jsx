import { useState, useEffect, useCallback } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import BusinessStatusPage from "./BusinessStatusPage";
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

  // Restore a saved session only after the backend validates its JWT.
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!getAuthToken()) {
        if (!cancelled) setAuthChecking(false);
        return;
      }
      try {
        const session = await fetchJson("/auth/me");
        if (!cancelled) handleLogin({ ...session, mode: "login" });
      } catch {
        setAuthToken(null);
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

  // Dev query parameter shortcut
  const isAdminRoute = new URLSearchParams(window.location.search).get("admin") === "1";
  if (isAdminRoute) return <AdminApprovalPage onLogout={() => (window.location.href = window.location.pathname)} />;

  function handleLogin(userData) {
    setUser(userData);

    if (userData.role === "business") {
      const existing = getBusinessByEmail(userData.email);

      if (userData.mode === "register") {
        // Always show registration form for new registrations
        setBusinessRecord(null);
        setBizState("needs-register");
      } else if (existing) {
        // Returning user with existing record → go straight to dashboard
        setBusinessRecord(existing);
        setBizState("has-record");
      } else {
        // Logged in but no business record yet → show registration
        setBusinessRecord(null);
        setBizState("needs-register");
      }
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
          initialData={businessRecord?.status === "rejected" ? businessRecord : undefined}
          onSubmit={handleBusinessDetailsSubmit}
          onBack={handleLogout}
        />
      );
    }

    if (bizState === "has-record" && businessRecord) {
      // Only approved businesses reach the dashboard; pending/rejected see their status.
      // The cross-tab subscription above re-renders this as soon as an admin decides.
      if (businessRecord.status !== "approved") {
        return (
          <BusinessStatusPage
            business={businessRecord}
            onRetry={() => setBizState("needs-register")}
            onLogout={handleLogout}
          />
        );
      }

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
    return <SupplierDashboard user={user} onLogout={handleLogout} />;
  }
}
