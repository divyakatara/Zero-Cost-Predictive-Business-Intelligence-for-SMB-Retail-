import { useEffect, useState } from "react";
import { fetchJson } from "./api";

const C = {
  bg: "#f5f2ec",
  card: "#ffffff",
  green: "#4a7a49",
  greenLight: "#c8d8c7",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text: "#1a1a1a",
  textMuted: "#5a6e5a",
  textDim: "#9aaa9a",
  border: "#e4ddd4",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm = { fontFamily: "'IBM Plex Sans', sans-serif" };

const emptyState = {
  headerNote: "Your partners & recommended suppliers · Waiting for backend data",
  mySuppliers: [],
  recommended: [],
  categories: ["All"],
};

function StarRating({ rating }) {
  return (
    <span style={{ color: "#c8a030", fontSize: 12, fontWeight: 600 }}>
      {"*".repeat(Math.max(1, Math.round(rating || 0)))}
      <span style={{ color: C.textDim, marginLeft: 4, fontSize: 11 }}>{rating}</span>
    </span>
  );
}

function SupplierDetailModal({ supplier, onClose, isMySupplier }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: "32px", width: 520, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text }}>{supplier.name}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{supplier.category} · {supplier.location}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textDim }}>x</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <StarRating rating={supplier.rating} />
          <span style={{ fontSize: 12, color: C.textDim }}>({supplier.reviews} reviews)</span>
          {isMySupplier && <span style={{ background: C.greenSubtle, color: C.green, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.greenBorder}` }}>Active Partner</span>}
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20, padding: "12px 14px", background: C.greenSubtle, borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>
          {supplier.desc}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Lead Time", value: supplier.leadTime },
            { label: "Fill Rate", value: supplier.fillRate },
            { label: "On-Time", value: supplier.onTime },
          ].map((item) => (
            <div key={item.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{item.label}</div>
              <div style={{ ...syne, fontSize: 16, fontWeight: 700, color: C.green }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {(supplier.tags || []).map((tag) => (
            <span key={tag} style={{ background: C.greenSubtle, color: C.textMuted, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, padding: "10px", background: C.green, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {isMySupplier ? "Contact Supplier" : "Request Quote"}
          </button>
          <button style={{ flex: 1, padding: "10px", background: "transparent", color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {isMySupplier ? "View Orders" : "Add to My Suppliers"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplierMarketplacePage() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isMySupplier, setIsMySupplier] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await fetchJson("/business-pages/suppliers");
        if (!ignore) {
          setData(response);
          setError("");
        }
      } catch {
        if (!ignore) {
          setData(emptyState);
          setError("Could not load supplier marketplace data from the backend.");
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  function openSupplier(supplier, isMine) {
    setSelectedSupplier(supplier);
    setIsMySupplier(isMine);
  }

  const filteredRecommended = (data.recommended || [])
    .filter((supplier) => {
      const matchCategory = categoryFilter === "All" || supplier.category === categoryFilter;
      const matchSearch =
        supplier.name.toLowerCase().includes(search.toLowerCase()) ||
        supplier.category.toLowerCase().includes(search.toLowerCase()) ||
        supplier.location.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });

  return (
    <div style={{ ...ibm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Supplier Marketplace</h1>
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

      <div style={{ marginBottom: 10 }}>
        <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>My Suppliers</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Your current tied-up suppliers · Click to view details</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 36 }}>
        {(data.mySuppliers || []).map((supplier) => (
          <div key={supplier.id} onClick={() => openSupplier(supplier, true)} style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, right: 14, background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>
              {supplier.status}
            </div>
            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 60 }}>{supplier.name}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{supplier.category}</div>
            <StarRating rating={supplier.rating} />
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>({supplier.reviews})</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Recommended Suppliers</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Ranked from your database records · Click for full profile</div>
        </div>
        <input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", width: 200, color: C.text, background: C.bg }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {(data.categories || ["All"]).map((category) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              border: `1px solid ${categoryFilter === category ? C.green : C.border}`,
              background: categoryFilter === category ? C.green : C.card,
              color: categoryFilter === category ? "#fff" : C.textDim,
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 500,
              transition: "all .12s",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {filteredRecommended.map((supplier) => (
          <div key={supplier.id} onClick={() => openSupplier(supplier, false)} style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ ...syne, background: supplier.rank <= 2 ? C.green : C.bg, color: supplier.rank <= 2 ? "#fff" : C.textDim, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${supplier.rank <= 2 ? "transparent" : C.border}` }}>
                #{supplier.rank}
              </span>
              {supplier.badge && (
                <span style={{ background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>
                  {supplier.badge}
                </span>
              )}
            </div>
            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 60 }}>{supplier.name}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{supplier.category} · {supplier.location}</div>
            <StarRating rating={supplier.rating} />
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>({supplier.reviews} reviews)</span>
          </div>
        ))}
      </div>

      {selectedSupplier && (
        <SupplierDetailModal supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} isMySupplier={isMySupplier} />
      )}
    </div>
  );
}
