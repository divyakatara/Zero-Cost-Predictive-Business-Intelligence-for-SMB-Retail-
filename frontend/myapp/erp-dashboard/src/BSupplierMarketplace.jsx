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
  amber: "#8a7020",
  amberBg: "#fdf8e8",
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
      {"★".repeat(Math.round(rating || 0))}{"☆".repeat(5 - Math.round(rating || 0))}
      <span style={{ color: C.textDim, marginLeft: 4, fontSize: 11 }}>{rating} / 5</span>
    </span>
  );
}

function RankBadge({ rank }) {
  if (!rank) return null;
  const top = rank <= 2;
  return (
    <span style={{ ...syne, background: top ? C.green : C.bg, color: top ? "#fff" : C.textDim, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${top ? "transparent" : C.border}` }}>
      Rank #{rank}
    </span>
  );
}

function SupplierCard({ supplier, onOpen }) {
  return (
    <div onClick={() => onOpen(supplier)} style={{ background: C.card, borderRadius: 12, padding: "20px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", position: "relative" }}>
      <div style={{ position: "absolute", top: 14, right: 14 }}><RankBadge rank={supplier.rank} /></div>
      <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 70 }}>{supplier.name}</div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{supplier.location}</div>
      <StarRating rating={supplier.rating} />
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted, marginTop: 10 }}>
        <span>On-time <strong style={{ color: C.text }}>{supplier.onTime}</strong></span>
        <span>Lead <strong style={{ color: C.text }}>{supplier.leadTime}</strong></span>
        <span>Score <strong style={{ color: C.text }}>{supplier.weightedScore}</strong></span>
      </div>
      {supplier.badge && (
        <div style={{ marginTop: 10 }}>
          <span style={{ background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>{supplier.badge}</span>
        </div>
      )}
    </div>
  );
}

function SupplierDetailModal({ supplier, onClose, onReorder }) {
  const risky = (supplier.riskScore || 0) >= 3;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: "32px", width: 540, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text }}>{supplier.name}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{supplier.location}</div>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textDim }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <StarRating rating={supplier.rating} />
          <RankBadge rank={supplier.rank} />
          {risky && <span style={{ background: C.amberBg, color: C.amber, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Supply risk {supplier.riskScore}/5</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 18 }}>
          {[
            ["On-Time", supplier.onTime],
            ["Lead Time", supplier.leadTime],
            ["Quality", supplier.quality],
            ["Reliability", supplier.reliability],
            ["Score", supplier.weightedScore],
          ].map(([label, value]) => (
            <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 8px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.green }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Supplies your products</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {supplier.products.length ? supplier.products.map((code) => (
            <span key={code} style={{ background: C.greenSubtle, color: C.textMuted, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500, fontFamily: "monospace" }}>{code}</span>
          )) : <span style={{ fontSize: 12, color: C.textDim }}>None of your products yet</span>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {supplier.contact && (
            <a href={`tel:${supplier.contact}`} style={{ flex: 1, padding: "10px", textAlign: "center", background: "transparent", color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: "none", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Call {supplier.contact}
            </a>
          )}
          {supplier.products.length > 0 && (
            <button onClick={onReorder} style={{ flex: 1, padding: "10px", background: C.green, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Reorder via Procurement AI →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupplierMarketplacePage({ business, onNavigate }) {
  // Same identity the procurement agent records on orders, so "My Suppliers" reflects this business's history
  const identity = business?.email || business?.businessName || "";
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(emptyState);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const query = identity ? `?business=${encodeURIComponent(identity)}` : "";
        const response = await fetchJson(`/business-pages/suppliers${query}`);
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
  }, [identity]);

  // Without any orders yet, the backend fills "my suppliers" with the top-ranked ones.
  const hasOrderHistory = (data.mySuppliers || []).some((supplier) => supplier.badge);
  const q = search.toLowerCase();
  const filteredRecommended = (data.recommended || []).filter(
    (supplier) =>
      (categoryFilter === "All" || supplier.location === categoryFilter) &&
      (supplier.name.toLowerCase().includes(q) || supplier.location.toLowerCase().includes(q)),
  );

  return (
    <div style={{ ...ibm }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
          <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Supplier Marketplace</h1>
        </div>
        <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>{data.headerNote}</p>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {hasOrderHistory ? "My Suppliers" : "Top-Ranked Suppliers"}
      </div>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
        {hasOrderHistory
          ? "Suppliers you have ordered from, most-used first · click for details"
          : "You haven't placed an order yet, so these are the best-ranked suppliers · click for details"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 36 }}>
        {(data.mySuppliers || []).map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} onOpen={setSelectedSupplier} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Other Suppliers</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Ranked by the weighted supplier score · click for details</div>
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
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {filteredRecommended.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} onOpen={setSelectedSupplier} />
        ))}
        {filteredRecommended.length === 0 && <div style={{ fontSize: 13, color: C.textDim }}>No suppliers match this filter.</div>}
      </div>

      {selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onReorder={() => { setSelectedSupplier(null); onNavigate?.("Procurement AI"); }}
        />
      )}
    </div>
  );
}
