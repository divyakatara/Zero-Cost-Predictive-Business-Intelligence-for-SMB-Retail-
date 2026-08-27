import { useEffect, useState } from "react";
import { fetchJson } from "./api";
import SupplierInventoryPage from './SInventoryPage';
import SalesPage from './SSalesPage';
import BusinessMarketplacePage from './SBusinessMarketplace';
import SAnalyticsPage from "./SAnalyticsPage";
import SAIInsightsPage from "./SAIInsightsPage";
import SAlertsPage from "./SAlertsPage";
import SSettingsPage from "./SSettingsPage";


const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  sidebar:     "#2a2a2a",
  card:        "#ffffff",
  cardGreen:   "#eef4ee",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  greenDeep:   "#2d4d2c",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
  sideMuted:   "#7a8a7a",
  sideDim:     "#4a5a4a",
  sideBorder:  "#3a3a3a",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const navItems = [
  { id: "dashboard",            label: "Dashboard",            icon: "▦" },
  { id: "inventory",            label: "Inventory",            icon: "◫" },
  { id: "sales",                label: "Sales",                icon: "◈" },
  { id: "businessmarketplace",  label: "Business Marketplace", icon: "◉" },
  { id: "analytics",            label: "Analytics",            icon: "◎" },
  { id: "aiinsights",           label: "AI Insights",          icon: "◌" },
  { id: "alerts",               label: "Alerts",               icon: "◬" },
  { id: "settings",             label: "Settings",             icon: "◍" },
];

const statusStyle = {
  ok:       { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a", label: "Healthy"  },
  low:      { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030", label: "Low"      },
  critical: { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030", label: "Critical" },
};

export default function SupplierDashboard({ user }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/inventory");
        if (!ignore && response?.items) {
          const mapped = response.items.map(item => ({
            product: item.name || item.id,
            stock: item.qty != null ? item.qty.toLocaleString() : "No data",
            reorder: item.reorder || 0,
            status: item.status === "critical" ? "critical" : item.status === "low" ? "low" : "ok",
          }));
          setRequirements(mapped);
        }
      } catch {
        /* keep default empty list on network error */
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, []);


  return (
    <div style={{ ...ibm, background: C.bg, minHeight: "100vh", display: "flex", color: C.text }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 248, background: C.sidebar, display: "flex", flexDirection: "column",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh",
        overflowY: "auto", borderRight: `1px solid ${C.sideBorder}`,
      }}>
        <div style={{ padding: "28px 24px 24px", borderBottom: `1px solid ${C.sideBorder}` }}>
          <div style={{ ...syne, fontWeight: 800, fontSize: 20, color: C.greenLight, letterSpacing: "1px" }}>SMART ERP</div>
          <div style={{ fontSize: 10, color: C.sideDim, marginTop: 4, letterSpacing: "2.5px", textTransform: "uppercase" }}>AI-Driven Business Suite</div>
        </div>

        <div style={{ padding: "18px 24px 8px" }}>
          <span style={{ fontSize: 10, color: C.sideDim, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 500 }}>Navigation</span>
        </div>

        {navItems.map((item) => {
          const active = activeNav === item.id;
          return (
            <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "11px 24px",
              background: active ? "#3a3a3a" : "transparent",
              color: active ? C.greenLight : C.sideMuted,
              border: "none",
              borderLeft: active ? `2px solid ${C.greenLight}` : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
              fontWeight: active ? 600 : 400,
              transition: "all .15s", textAlign: "left",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", padding: "20px 24px", borderTop: `1px solid ${C.sideBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3a3a3a", border: `1px solid ${C.sideBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.greenLight, fontWeight: 700 }}>U</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.greenLight }}>{user?.name || "User"}</div>
              <div style={{ fontSize: 11, color: C.sideDim }}>{user?.supplier_id || "Supplier"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>

        {/* Header */}
        {activeNav === "dashboard" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }}></div>
              <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Supplier Dashboard</h1>
            </div>
            <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>
              {user?.supplier_id ? `AI-Driven overview · Linked to ${user.supplier_id}` : "AI-Driven overview · No linked supplier yet"}
            </p>
          </div>
          <div style={{ padding: "8px 16px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600, letterSpacing: "0.5px" }}>
            ◈ Live Feed
          </div>
        </div>
        )}

        {activeNav === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>

            {/* ── Business Requirements ── */}
            <div style={{ background: C.card, borderRadius: 14, padding: "24px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ ...syne, fontWeight: 700, color: C.text, fontSize: 15, marginBottom: 4 }}>My Business Requirements</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>Summary and status of critical items</div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Product", "Stock", "Reorder Lvl", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r) => {
                    const s = statusStyle[r.status];
                    return (
                      <tr key={r.product} style={{ borderBottom: `1px solid ${C.border}44` }}>
                        <td style={{ padding: "12px 8px", fontWeight: 600, fontSize: 13, color: C.text }}>{r.product}</td>
                        <td style={{ padding: "12px 8px", fontSize: 13, color: C.textMuted }}>{r.stock}</td>
                        <td style={{ padding: "12px 8px", fontSize: 13, color: C.textMuted, fontFamily: "monospace" }}>{r.reorder}</td>
                        <td style={{ padding: "12px 8px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }}></span>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


          </div>
        )}

        {activeNav === "inventory" && <SupplierInventoryPage />}
        {activeNav === "sales" && <SalesPage />}
        {activeNav === "businessmarketplace" && <BusinessMarketplacePage />}
        {activeNav === "analytics" && <SAnalyticsPage />}
        {activeNav === "aiinsights" && <SAIInsightsPage />}
        {activeNav === "alerts" && <SAlertsPage />}
        {activeNav === "settings" && <SSettingsPage />}

        

        {/* Placeholder for other pages */}
        {activeNav !== "dashboard" && activeNav !== "inventory" && activeNav !== "sales" && activeNav !== "businessmarketplace" && activeNav !== "analytics" && activeNav !== "aiinsights" && activeNav !== "alerts" && activeNav !== "settings" &&(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: C.green, marginBottom: 20 }}>◎</div>
            <div style={{ ...syne, fontSize: 22, fontWeight: 700, color: C.text }}>
              {navItems.find(n => n.id === activeNav)?.label}
            </div>
            <div style={{ fontSize: 13, marginTop: 8, color: C.textDim }}>This page is coming soon</div>
          </div>
        )}

      </main>
    </div>
  );
}
