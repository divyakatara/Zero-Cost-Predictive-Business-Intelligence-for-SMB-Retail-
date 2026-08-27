import { useState } from "react";
import LoginPage from "./LoginPage";
import BRegisterBusinessPage from "./BRegisterBusinessPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import BInventoryPage from "./BInventoryPage";
import BSalesPage from "./BSalesPage";
import BSupplierMarketplace from "./BSupplierMarketplace";
import BAnalyticsPage from "./BAnalyticsPage";
import BAIInsightsPage from "./BAIInsightsPage";
import BAlertsPage from "./BAlertsPage";
import SBusinessMarketplace from "./SBusinessMarketplace";


export default function App() {
  const [user, setUser] = useState(null);
  const [needsBusinessDetails, setNeedsBusinessDetails] = useState(false);

  function handleLogin(userData) {
    setUser(userData);
    if (userData.mode === "register" && userData.role === "business") {
      setNeedsBusinessDetails(true);
    }
  }

  function handleBusinessDetailsSubmit(businessData) {
    console.log("Business registered:", { user, businessData });
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

  if (user.role === "business") return <BusinessDashboard />;
  if (user.role === "supplier") return <SupplierDashboard />;
}