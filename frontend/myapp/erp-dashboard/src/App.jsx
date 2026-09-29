import { useState, useEffect } from "react";
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
  // "idle" | "loading" | "needs-register" | "has-record"
  const [bizState, setBizState] = useState("idle");
  const [businessRecord, setBusinessRecord] = useState(null);

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
        if (!cancelled) await applyVerifiedSession({ ...session, mode: "login" });
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

  // Real-time updates when an admin approves/rejects in another tab. Reads the
  // local cache only: re-fetching here would re-save the cache and re-fire this event.
  useEffect(() => {
    if (user?.role !== "business" || !user?.email) return undefined;
    const email = user.email.toLowerCase();
    const unsubscribe = subscribeBusinessChanges((businesses) => {
      const record = businesses.find((b) => (b.userEmail || "").toLowerCase() === email);
      if (record) {
        setBusinessRecord(record);
        setBizState("has-record");
      }
    });
    return unsubscribe;
  }, [user?.role, user?.email]);

  // Only use identity and role returned by the backend's token-verified session.
  async function applyVerifiedSession(userData) {
    setUser(userData);

    if (userData.role !== "business") {
      setBusinessRecord(null);
      setBizState("idle");
      return;
    }

    if (userData.mode === "register") {
      // A brand-new account always starts with the business details form.
      setBusinessRecord(null);
      setBizState("needs-register");
      return;
    }

    setBizState("loading");
    const existing = await getBusinessByEmail(userData.email);
    setBusinessRecord(existing || null);
    setBizState(existing ? "has-record" : "needs-register");
  }

  async function handleLogin(loginResponseUser) {
    let verifiedSession;
    try {
      // Re-check the token with the server instead of trusting client-supplied role data.
      verifiedSession = await fetchJson("/auth/me");
      if (
        !verifiedSession?.role ||
        !["admin", "business", "supplier"].includes(verifiedSession.role) ||
        verifiedSession.role !== loginResponseUser.role
      ) {
        throw new Error("The server could not verify this user session.");
      }
    } catch {
      setAuthToken(null);
      setUser(null);
      setBizState("idle");
      setBusinessRecord(null);
      throw new Error("Unable to verify your session. Please sign in again.");
    }
    await applyVerifiedSession({ ...verifiedSession, mode: loginResponseUser.mode || "login" });
  }

  // Saves the registration to the backend; errors propagate so the form can show them.
  async function handleBusinessDetailsSubmit(businessData) {
    if (!user) return;
    const record = await submitBusiness(user.email, businessData);
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
    if (bizState === "loading") {
      return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Loading your business profile...</div>;
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

    // No registration yet (or resubmitting after a rejection)
    return (
      <BRegisterBusinessPage
        user={user}
        initialData={businessRecord?.status === "rejected" ? businessRecord : undefined}
        onSubmit={handleBusinessDetailsSubmit}
        onBack={handleLogout}
      />
    );
  }

  if (user.role === "supplier") {
    return <SupplierDashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}
