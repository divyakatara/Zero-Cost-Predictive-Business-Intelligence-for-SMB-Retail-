import { useEffect, useState } from "react";
import { fetchJson } from "./api";

const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  green: "#4a7a49",
  greenLight: "#c8d8c7",
  greenMid: "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const statusMap = {
  ok: { bg: "#eef6ee", color: "#3a7a3a", dot: "#3a7a3a", label: "Healthy" },
  low: { bg: "#fdf8e8", color: "#8a7020", dot: "#c8a030", label: "Low" },
  critical: { bg: "#fdf0f0", color: "#8a2020", dot: "#c83030", label: "Critical" },
};

const emptyData = {
  headerNote: "Real-time stock levels · Waiting for backend data",
  stats: [],
  items: [],
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(emptyData);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/inventory");
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyData);
          setError("Could not load inventory data from the backend.");
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = (data.items || []).filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ ...ibm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Inventory</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>{data.headerNote}</p>
        </div>
        <div style={{ padding: "8px 16px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600, letterSpacing: "0.5px" }}>
          Live Feed
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {(data.stats || []).map((stat) => (
          <div key={stat.label} style={{ background: C.card, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: C.textDim, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontSize: 18, color: C.green }}>{stat.icon}</span>
            </div>
            <div style={{ ...syne, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, marginTop: 8, color: C.textDim, fontWeight: 500 }}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text }}>All Inventory Items</div>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontFamily: "'IBM Plex Sans', sans-serif",
              outline: "none",
              width: 220,
              color: C.text,
              background: C.bg,
            }}
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.greenSubtle, borderBottom: `1px solid ${C.border}` }}>
              {["SKU", "Product", "Category", "Stock Level", "Reorder Qty", "Status", "Supplier", "Updated", "Action"].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "12px 20px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const status = statusMap[item.status] || statusMap.ok;
              const progress = item.reorder > 0 ? Math.min(100, Math.round((item.qty / item.reorder) * 100)) : 100;
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: C.textDim, fontFamily: "monospace" }}>{item.id}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 600, fontSize: 13, color: C.text }}>{item.name}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ background: C.greenSubtle, color: C.textMuted, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 500, border: `1px solid ${C.greenBorder}` }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 80, height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: C.green, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.textDim }}>{item.qty} {item.unit}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: C.textMuted, fontFamily: "monospace" }}>{item.reorder}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: status.bg, color: status.color, padding: "4px 11px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot, display: "inline-block" }} />
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: C.textMuted }}>{item.supplier}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: C.textDim }}>{item.updated}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <button style={{ background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", color: C.green }}>
                      Reorder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
