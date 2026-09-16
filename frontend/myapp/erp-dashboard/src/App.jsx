import { useState, useEffect, useCallback } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import { getBusinessByEmail, submitBusiness, subscribeBusinessChanges } from "./businessStore";

export default function App() {
  const [user, setUser] = useState(null);
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
    setUser(null);
    setBizState("idle");
    setBusinessRecord(null);
  }

  // ── Routing ──────────────────────────────────────────────

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

  if (user.role === "supplier") return <SupplierDashboard />;
}