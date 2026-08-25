import { useState } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import BusinessStatusPage from "./BusinessStatusPage";
import AdminApprovalPage from "./AdminApprovalPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import BInventoryPage from "./BInventoryPage";
import BSalesPage from "./BSalesPage";
import BSupplierMarketplace from "./BSupplierMarketplace";
import BAnalyticsPage from "./BAnalyticsPage";
import BAIInsightsPage from "./BAIInsightsPage";
import BAlertsPage from "./BAlertsPage";
import SBusinessMarketplace from "./SBusinessMarketplace";
import { getBusinessByEmail, submitBusiness } from "./businessStore";


export default function App() {
  const [user, setUser] = useState(null);
  const [needsBusinessDetails, setNeedsBusinessDetails] = useState(false);

  // Dev-only admin route: open the app with ?admin=1 to review registrations.
  // Replace with real admin auth before going to production.
  const isAdminRoute = new URLSearchParams(window.location.search).get("admin") === "1";
  if (isAdminRoute) return <AdminApprovalPage />;

  function handleLogin(userData) {
    setUser(userData);
    if (userData.mode === "register" && userData.role === "business") {
      setNeedsBusinessDetails(true);
    }
  }

  function handleBusinessDetailsSubmit(businessData) {
    submitBusiness(user.email, businessData);
    setNeedsBusinessDetails(false);
  }

  function handleLogout() {
    setUser(null);
    setNeedsBusinessDetails(false);
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (needsBusinessDetails) {
    return (
      <BRegisterBusinessPage
        user={user}
        onSubmit={handleBusinessDetailsSubmit}
        onBack={() => setNeedsBusinessDetails(false)}
      />
    );
  }

  if (user.role === "business") {
    const myBusiness = getBusinessByEmail(user.email);

    if (!myBusiness) {
      return (
        <BRegisterBusinessPage
          user={user}
          onSubmit={handleBusinessDetailsSubmit}
          onBack={handleLogout}
        />
      );
    }

    if (myBusiness.status === "pending" || myBusiness.status === "rejected") {
      return (
        <BusinessStatusPage
          business={myBusiness}
          onRetry={() => setNeedsBusinessDetails(true)}
          onLogout={handleLogout}
        />
      );
    }

    return <BusinessDashboard />;
  }

  if (user.role === "supplier") return <SupplierDashboard />;
}