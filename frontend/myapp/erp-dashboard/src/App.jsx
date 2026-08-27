import { useState, useEffect } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import { getBusinessByEmail, submitBusiness, subscribeBusinessChanges } from "./businessStore";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsBusinessDetails, setNeedsBusinessDetails] = useState(false);
  const [businessRecord, setBusinessRecord] = useState(null);

  // Sync business record whenever user changes or local storage updates
  useEffect(() => {
    if (user && user.role === "business") {
      const rec = getBusinessByEmail(user.email);
      setBusinessRecord(rec);
    }
  }, [user]);

  // Real-time subscription for cross-tab approvals
  useEffect(() => {
    const unsubscribe = subscribeBusinessChanges(() => {
      if (user && user.role === "business") {
        const updated = getBusinessByEmail(user.email);
        setBusinessRecord(updated);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Dev query parameter shortcut
  const isAdminRoute = new URLSearchParams(window.location.search).get("admin") === "1";
  if (isAdminRoute) return <AdminApprovalPage onLogout={() => (window.location.href = window.location.pathname)} />;

  function handleLogin(userData) {
    setUser(userData);
    if (userData.role === "business") {
      const existing = getBusinessByEmail(userData.email);
      if (!existing || userData.mode === "register") {
        setNeedsBusinessDetails(true);
      } else {
        setBusinessRecord(existing);
      }
    }
  }

  function handleBusinessDetailsSubmit(businessData) {
    const record = submitBusiness(user.email, businessData);
    setBusinessRecord(record);
    setNeedsBusinessDetails(false);
  }

  function handleLogout() {
    setUser(null);
    setNeedsBusinessDetails(false);
    setBusinessRecord(null);
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (user.role === "admin") {
    return <AdminApprovalPage onLogout={handleLogout} />;
  }

  if (user.role === "business") {
    if (needsBusinessDetails || !businessRecord) {
      return (
        <BRegisterBusinessPage
          user={user}
          onSubmit={handleBusinessDetailsSubmit}
          onBack={handleLogout}
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

  if (user.role === "supplier") return <SupplierDashboard />;
}