import { useState, useEffect, useCallback } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import BusinessStatusPage from "./BusinessStatusPage";
import SupplierDashboard from "./SupplierDashboard";

import {
  getBusinessByEmail,
  submitBusiness,
  subscribeBusinessChanges,
} from "./businessStore";

export default function App() {
  const [user, setUser] = useState(null);

  // "idle" | "needs-register" | "has-record"
  const [bizState, setBizState] = useState("idle");
  const [businessRecord, setBusinessRecord] = useState(null);

  // Keep business record synchronized with the backend
  const syncBusiness = useCallback(async (email) => {
    if (!email) {
      setBusinessRecord(null);
      setBizState("needs-register");
      return null;
    }

    try {
      const record = await getBusinessByEmail(email);

      if (record) {
        setBusinessRecord(record);
        setBizState("has-record");
      } else {
        setBusinessRecord(null);
        setBizState("needs-register");
      }

      return record;
    } catch (error) {
      console.error("Failed to fetch business:", error);

      setBusinessRecord(null);
      setBizState("needs-register");

      return null;
    }
  }, []);

  // Load the business record whenever a business user is logged in
  useEffect(() => {
    if (user?.role === "business" && user?.email) {
      syncBusiness(user.email);
    }
  }, [user?.role, user?.email, syncBusiness]);

  // Keep existing localStorage/cross-tab synchronization
  useEffect(() => {
    if (user?.role !== "business" || !user?.email) {
      return;
    }

    const unsubscribe = subscribeBusinessChanges((businesses) => {
      const email = user.email.toLowerCase();

      const record =
        businesses.find(
          (business) =>
            (business.userEmail || business.email || "").toLowerCase() ===
            email
        ) || null;

      if (record) {
        setBusinessRecord(record);
        setBizState("has-record");
      }
    });

    return unsubscribe;
  }, [user?.role, user?.email]);

  // Dev/admin query parameter shortcut
  const isAdminRoute =
    new URLSearchParams(window.location.search).get("admin") === "1";

  const isAdminRoutePath =
    window.location.pathname === "/admin" ||
    window.location.pathname === "/admin/";

  if (isAdminRoute || isAdminRoutePath) {
    return (
      <AdminApprovalPage
        onLogout={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  async function handleLogin(userData) {
    setUser(userData);

    if (userData?.role === "business") {
      const existing = await syncBusiness(userData.email);

      if (userData.mode === "register") {
        // New registration should always start with the registration form.
        setBusinessRecord(null);
        setBizState("needs-register");
      } else if (existing) {
        // Existing business user
        setBusinessRecord(existing);
        setBizState("has-record");
      } else {
        // Logged in but no business registration exists.
        setBusinessRecord(null);
        setBizState("needs-register");
      }
    }
  }

  // --------------------------------------------------
  // Business Registration
  // --------------------------------------------------

  async function handleBusinessDetailsSubmit(businessData) {
    if (!user) {
      return;
    }

    try {
      const record = await submitBusiness(user.email, businessData);

      setBusinessRecord(record);
      setBizState("has-record");
    } catch (error) {
      console.error("Business registration failed:", error);

      // BRegisterBusinessPage handles and displays this error.
      throw error;
    }
  }

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  function handleLogout() {
    setUser(null);
    setBizState("idle");
    setBusinessRecord(null);
  }

  // --------------------------------------------------
  // Routing
  // --------------------------------------------------

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Admin
  if (user.role === "admin") {
    return <AdminApprovalPage onLogout={handleLogout} />;
  }

  // Business
  if (user.role === "business") {
    // No business registration yet
    if (bizState === "needs-register") {
      return (
        <BRegisterBusinessPage
          user={user}
          initialData={
            businessRecord?.status === "rejected"
              ? businessRecord
              : undefined
          }
          onSubmit={handleBusinessDetailsSubmit}
          onBack={() => setBizState("needs-register")}
          onLogout={handleLogout}
        />
      );
    }

    // Existing business record
    if (bizState === "has-record" && businessRecord) {
      // Only approved businesses can access the dashboard.
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

    // Fallback while business state is loading/unknown
    return (
      <BRegisterBusinessPage
        user={user}
        onSubmit={handleBusinessDetailsSubmit}
        onBack={handleLogout}
        onLogout={handleLogout}
      />
    );
  }

  // Supplier
  if (user.role === "supplier") {
    return <SupplierDashboard user={user} />;
  }

  return null;
}
