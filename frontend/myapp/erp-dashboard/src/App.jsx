import { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import BusinessDashboard from "./BusinessDashboard";
import SupplierDashboard from "./SupplierDashboard";
import BInventoryPage from "./BInventoryPage";
import BSalesPage from "./BSalesPage";
import BSupplierMarketplace from "./BSupplierMarketplace";
import BAnalyticsPage from "./BAnalyticsPage";
import BAIInsightsPage from "./BAIInsightsPage";
import BAlertsPage from "./BAlertsPage";
import SBusinessMarketplace from "./SBusinessMarketplace";
import SAnalyticsPage from "./SAnalyticsPage";
import SAIInsightsPage from "./SAIInsightsPage";
import SSettingsPage from "./SSettingsPage";
import ChatWidget from "./ChatWidget";


const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);


export default function App() {
  const [user, setUser] = useState(null);
  const [viewState, setViewState] = useState({ nav: "Dashboard", settingsTab: null });
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Not Verified");
  const [hasSeenVerificationPrompt, setHasSeenVerificationPrompt] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("gstVerificationState");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.status) setVerificationStatus(parsed.status);
        if (parsed?.hasSeenPrompt) setHasSeenVerificationPrompt(true);
      } catch {
        // Ignore malformed persisted state and fall back to defaults.
      }
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "business") {
      setShowVerificationPrompt(false);
      return;
    }

    if (verificationStatus !== "Verified" && !hasSeenVerificationPrompt) {
      setShowVerificationPrompt(true);
    }
  }, [user, verificationStatus, hasSeenVerificationPrompt]);

  useEffect(() => {
    window.localStorage.setItem(
      "gstVerificationState",
      JSON.stringify({
        status: verificationStatus,
        hasSeenPrompt: hasSeenVerificationPrompt,
      }),
    );
  }, [verificationStatus, hasSeenVerificationPrompt]);

  let currentPage = <LoginPage onLogin={setUser} />;

  if (user?.role === "business") {
    currentPage = (
      <BusinessDashboard
        activeNav={viewState.nav}
        onNavChange={(nav) => setViewState((prev) => ({ ...prev, nav }))}
        settingsTab={viewState.settingsTab}
        onSettingsTabChange={(settingsTab) => setViewState((prev) => ({ ...prev, settingsTab }))}
        verificationStatus={verificationStatus}
        onVerificationStatusChange={setVerificationStatus}
        verificationPromptOpen={showVerificationPrompt}
        onCloseVerificationPrompt={() => {
          setShowVerificationPrompt(false);
          setHasSeenVerificationPrompt(true);
        }}
      />
    );
  }

  if (user?.role === "supplier") {
    currentPage = <SupplierDashboard user={user} />;
  }

  return (
    <>
      {currentPage}
      <ChatWidget />
    </>
  );
}
