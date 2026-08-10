import { useState } from "react";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  danger:      "#c83030",
  dangerBg:    "#fdf0f0",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const tabs = ["Supplier Profile", "Account", "Preferences", "Data", "Security"];

export default function SSettingsPage() {
  const [activeTab, setActiveTab] = useState("Supplier Profile");

  const [accountToggles, setAccountToggles] = useState({
    emailNotifications: true,
    orderAlerts: true,
    deliveryAlerts: true,
    marketplaceUpdates: false,
    weeklyReports: false,
  });

  const [preferenceToggles, setPreferenceToggles] = useState({
    compactDashboard: false,
    autoSave: true,
    showAI: true,
    alertHighlights: true,
    smartForecast: false,
  });

  const [securityToggles, setSecurityToggles] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: true,
    deviceVerification: false,
  });

  function toggleAccount(key) {
    setAccountToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePreference(key) {
    setPreferenceToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSecurity(key) {
    setSecurityToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ ...ibm }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>
              Settings
            </h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
            Manage your supplier account and application preferences
          </p>
        </div>
        <button style={{
          padding: "10px 18px",
          background: C.green,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'IBM Plex Sans', sans-serif",
          boxShadow: "0 4px 16px rgba(74,122,73,0.2)",
        }}>
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              border: `1px solid ${activeTab === tab ? C.green : C.border}`,
              background: activeTab === tab ? C.green : C.card,
              color: activeTab === tab ? "#fff" : C.textDim,
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              transition: "all .12s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Supplier Profile */}
      {activeTab === "Supplier Profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>Supplier Details</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle()}>Supplier Name</label>
                <input defaultValue="Smart ERP Supplier" style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Owner Name</label>
                <input defaultValue="User" style={inputStyle()} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle()}>Supplier Email</label>
                <input defaultValue="supplier@email.com" style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Phone Number</label>
                <input defaultValue="+91 00000 00000" style={inputStyle()} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Supplier Address</label>
              <input defaultValue="Supplier address" style={inputStyle()} />
            </div>

            <div>
              <label style={labelStyle()}>Supplier Description</label>
              <textarea defaultValue="Supplier description" style={textareaStyle()} />
            </div>
          </div>

          <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 18 }}>Profile Summary</div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>Supplier Type</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>General Supplier</div>
              </div>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>No data</div>
              </div>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>GST / Tax ID</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>No data</div>
              </div>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>Working Hours</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>No data</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account */}
      {activeTab === "Account" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>Account Information</div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Username</label>
              <input defaultValue="user" style={inputStyle()} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Email</label>
              <input defaultValue="user@email.com" style={inputStyle()} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Role</label>
              <input defaultValue="Supplier" style={inputStyle()} />
            </div>

            <div>
              <label style={labelStyle()}>Language</label>
              <input defaultValue="English" style={inputStyle()} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>Notification Settings</div>

            <div style={{ display: "grid", gap: 14 }}>
              <ToggleRow label="Email Notifications" value={accountToggles.emailNotifications} onToggle={() => toggleAccount("emailNotifications")} />
              <ToggleRow label="Order Alerts" value={accountToggles.orderAlerts} onToggle={() => toggleAccount("orderAlerts")} />
              <ToggleRow label="Delivery Alerts" value={accountToggles.deliveryAlerts} onToggle={() => toggleAccount("deliveryAlerts")} />
              <ToggleRow label="Marketplace Updates" value={accountToggles.marketplaceUpdates} onToggle={() => toggleAccount("marketplaceUpdates")} />
              <ToggleRow label="Weekly Reports" value={accountToggles.weeklyReports} onToggle={() => toggleAccount("weeklyReports")} />
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      {activeTab === "Preferences" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>App Preferences</div>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={labelStyle()}>Currency</label>
                <input defaultValue="INR (₹)" style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Date Format</label>
                <input defaultValue="DD/MM/YYYY" style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Timezone</label>
                <input defaultValue="Asia/Kolkata" style={inputStyle()} />
              </div>
            </div>
          </div>

          <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 18 }}>Display & Workflow</div>

            <div style={{ display: "grid", gap: 14 }}>
              <ToggleRow label="Compact Dashboard View" value={preferenceToggles.compactDashboard} onToggle={() => togglePreference("compactDashboard")} />
              <ToggleRow label="Auto-save Changes" value={preferenceToggles.autoSave} onToggle={() => togglePreference("autoSave")} />
              <ToggleRow label="Show AI Suggestions" value={preferenceToggles.showAI} onToggle={() => togglePreference("showAI")} />
              <ToggleRow label="Enable Alert Highlights" value={preferenceToggles.alertHighlights} onToggle={() => togglePreference("alertHighlights")} />
              <ToggleRow label="Use Smart Forecast Mode" value={preferenceToggles.smartForecast} onToggle={() => togglePreference("smartForecast")} />
            </div>
          </div>
        </div>
      )}

      {/* Data */}
      {activeTab === "Data" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>Supplier Data Controls</div>

            <div style={{ display: "grid", gap: 12 }}>
              {[
                "Manage product listings",
                "Update supply inventory",
                "Track order data",
                "Import stock sheet",
                "Export reports",
              ].map(item => (
                <div key={item} style={actionRowStyle()}>
                  <span style={{ fontSize: 13, color: C.text }}>{item}</span>
                  <button style={secondaryButtonStyle()}>Manage</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 18 }}>Backup & Sync</div>

            <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>Last Backup</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>No data</div>
              </div>
              <div style={summaryCardStyle()}>
                <div style={{ fontSize: 11, color: C.textDim }}>Sync Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 4 }}>No data</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={primaryButtonStyle()}>Backup Now</button>
              <button style={secondaryButtonStyle()}>Sync Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === "Security" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

          <div style={{ background: C.card, borderRadius: 12, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 18 }}>Password & Access</div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>Current Password</label>
              <input type="password" defaultValue="password" style={inputStyle()} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle()}>New Password</label>
              <input type="password" defaultValue="password" style={inputStyle()} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle()}>Confirm Password</label>
              <input type="password" defaultValue="password" style={inputStyle()} />
            </div>

            <button style={primaryButtonStyle()}>Update Password</button>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: C.cardGreen, borderRadius: 12, padding: "24px", border: `1px solid ${C.greenBorder}`, boxShadow: "0 1px 4px rgba(74,122,73,0.08)" }}>
              <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 18 }}>Security Options</div>

              <div style={{ display: "grid", gap: 14 }}>
                <ToggleRow label="Two-Factor Authentication" value={securityToggles.twoFactor} onToggle={() => toggleSecurity("twoFactor")} />
                <ToggleRow label="Login Alerts" value={securityToggles.loginAlerts} onToggle={() => toggleSecurity("loginAlerts")} />
                <ToggleRow label="Session Timeout" value={securityToggles.sessionTimeout} onToggle={() => toggleSecurity("sessionTimeout")} />
                <ToggleRow label="Device Verification" value={securityToggles.deviceVerification} onToggle={() => toggleSecurity("deviceVerification")} />
              </div>
            </div>

            <div style={{ background: C.dangerBg, borderRadius: 12, padding: "24px", border: "1px solid #f2bcbc", boxShadow: "0 1px 4px rgba(200,48,48,0.06)" }}>
              <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.danger, marginBottom: 10 }}>Danger Zone</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
                Deactivate account or remove supplier workspace permanently.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={{
                  padding: "10px 16px",
                  background: "#fff",
                  color: C.danger,
                  border: "1px solid #f2bcbc",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  Deactivate
                </button>
                <button style={{
                  padding: "10px 16px",
                  background: C.danger,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <div style={toggleRowStyle()}>
      <span style={{ fontSize: 13, color: "#1a1a1a" }}>{label}</span>
      <button
        onClick={onToggle}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: value ? "#4a7a49" : "#c8d8c7",
          position: "relative",
          transition: "all .18s ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "all .18s ease",
            boxShadow: "0 1px 4px rgba(0,0,0,0.16)",
          }}
        />
      </button>
    </div>
  );
}

function labelStyle() {
  return {
    fontSize: 12,
    fontWeight: 600,
    color: "#5a6e5a",
    display: "block",
    marginBottom: 8,
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 9,
    fontSize: 14,
    border: "1px solid #e4ddd4",
    background: "#f5f2ec",
    color: "#1a1a1a",
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textareaStyle() {
  return {
    width: "100%",
    minHeight: 110,
    padding: "11px 14px",
    borderRadius: 9,
    fontSize: 14,
    border: "1px solid #e4ddd4",
    background: "#f5f2ec",
    color: "#1a1a1a",
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
  };
}

function summaryCardStyle() {
  return {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 16px",
    border: "1px solid #c8d8c7",
  };
}

function toggleRowStyle() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderRadius: 10,
    background: "#fff",
    border: "1px solid #e4ddd4",
  };
}

function actionRowStyle() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderRadius: 10,
    background: "#f0f6f0",
    border: "1px solid #c8d8c7",
  };
}

function primaryButtonStyle() {
  return {
    padding: "10px 16px",
    background: "#4a7a49",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  };
}

function secondaryButtonStyle() {
  return {
    padding: "10px 16px",
    background: "#fff",
    color: "#4a7a49",
    border: "1px solid #c8d8c7",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  };
}