import { useState } from "react";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const C = {
  bg:          "#f5f2ec",
  card:        "#ffffff",
  green:       "#4a7a49",
  greenLight:  "#c8d8c7",
  greenMid:    "#7aaa79",
  greenBorder: "#c8d8c7",
  greenSubtle: "#f0f6f0",
  text:        "#1a1a1a",
  textMuted:   "#5a6e5a",
  textDim:     "#9aaa9a",
  border:      "#e4ddd4",
};

const syne = { fontFamily: "Syne, sans-serif" };
const ibm  = { fontFamily: "'IBM Plex Sans', sans-serif" };

const myBusinesses = [
  {
    id: 1, name: "Business #1", category: "Category 1",
    rating: 0, reviews: 0, status: "Active", since: "No data",
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", contact: "No data",
    phone: "No data", location: "No data",
    desc: "No business details available yet.",
  },
  {
    id: 2, name: "Business #2", category: "Category 2",
    rating: 0, reviews: 0, status: "Active", since: "No data",
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", contact: "No data",
    phone: "No data", location: "No data",
    desc: "No business details available yet.",
  },
  {
    id: 3, name: "Business #3", category: "Category 3",
    rating: 0, reviews: 0, status: "Active", since: "No data",
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", contact: "No data",
    phone: "No data", location: "No data",
    desc: "No business details available yet.",
  },
];

const recommendedBusinesses = [
  {
    id: 4, name: "Business #4", category: "Category 4",
    rating: 0, reviews: 0, rank: 1,
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: "Top Match",
  },
  {
    id: 5, name: "Business #5", category: "Category 5",
    rating: 0, reviews: 0, rank: 2,
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: "Good Match",
  },
  {
    id: 6, name: "Business #6", category: "Category 6",
    rating: 0, reviews: 0, rank: 3,
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: "Good Match",
  },
  {
    id: 7, name: "Business #7", category: "Category 7",
    rating: 0, reviews: 0, rank: 4,
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: null,
  },
  {
    id: 8, name: "Business #8", category: "Category 8",
    rating: 0, reviews: 0, rank: 5,
    tags: ["Item 1", "Item 2"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: null,
  },
  {
    id: 9, name: "Business #9", category: "Category 9",
    rating: 0, reviews: 0, rank: 6,
    tags: ["Item 1", "Item 2", "Item 3"], orderFreq: "0 orders",
    paymentCycle: "0 days", onTimePay: "0%", location: "No data",
    desc: "No business details available yet.",
    badge: null,
  },
];

const categories = ["All", "Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6", "Category 7", "Category 8", "Category 9"];

function StarRating({ rating }) {
  return (
    <span style={{ color: "#c8a030", fontSize: 12, fontWeight: 600 }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
      <span style={{ color: C.textDim, marginLeft: 4, fontSize: 11 }}>{rating}</span>
    </span>
  );
}

function BusinessDetailModal({ business, onClose, isMyBusiness }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 16, padding: "32px", width: 520, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,0.15)", border: `1px solid ${C.border}` }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ ...syne, fontSize: 20, fontWeight: 800, color: C.text }}>{business.name}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{business.category} · {business.location}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textDim }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <StarRating rating={business.rating} />
          <span style={{ fontSize: 12, color: C.textDim }}>({business.reviews} reviews)</span>
          {isMyBusiness && <span style={{ background: C.greenSubtle, color: C.green, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.greenBorder}` }}>Active Client</span>}
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 20, padding: "12px 14px", background: C.greenSubtle, borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>
          {business.desc}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Order Freq",    value: business.orderFreq },
            { label: "Pay Cycle",     value: business.paymentCycle },
            { label: "On-Time Pay",   value: business.onTimePay },
          ].map(m => (
            <div key={m.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{m.label}</div>
              <div style={{ ...syne, fontSize: 16, fontWeight: 700, color: C.green }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {business.tags.map(t => (
            <span key={t} style={{ background: C.greenSubtle, color: C.textMuted, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{t}</span>
          ))}
        </div>

        {isMyBusiness && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Contact Details</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{business.contact}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{business.phone}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Client since {business.since}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {isMyBusiness ? (
            <>
              <button style={{ flex: 1, padding: "10px", background: C.green, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Contact Business
              </button>
              <button style={{ flex: 1, padding: "10px", background: "transparent", color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                View Orders
              </button>
            </>
          ) : (
            <>
              <button style={{ flex: 1, padding: "10px", background: C.green, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Send Proposal
              </button>
              <button style={{ flex: 1, padding: "10px", background: "transparent", color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Add Client
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SSupplierMarketplacePage() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isMyBusiness, setIsMyBusiness] = useState(false);
  const [hoveredMy, setHoveredMy] = useState(null);
  const [hoveredRec, setHoveredRec] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  function openBusiness(business, isMine) {
    setSelectedBusiness(business);
    setIsMyBusiness(isMine);
  }

  const filteredRec = recommendedBusinesses
    .filter(b => {
      const matchCat = categoryFilter === "All" || b.category === categoryFilter;
      const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ ...ibm }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: C.green, borderRadius: 2 }} />
            <h1 style={{ ...syne, margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "0.5px" }}>Business Marketplace</h1>
          </div>
          <p style={{ margin: "0 0 0 13px", color: C.textDim, fontSize: 12, letterSpacing: "0.5px" }}>Your clients & recommended businesses · Ranked by reviews</p>
        </div>
        <div style={{ padding: "8px 16px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600, letterSpacing: "0.5px" }}>
          Live Feed
        </div>
      </div>

      {/* My Clients */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>My Clients</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Your current tied-up businesses · Hover to preview · Click to view details</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 36 }}>
        {myBusinesses.map((b) => (
          <div key={b.id}
            onMouseEnter={() => setHoveredMy(b.id)}
            onMouseLeave={() => setHoveredMy(null)}
            onClick={() => openBusiness(b, true)}
            style={{
              background: C.card, borderRadius: 12, padding: "20px",
              border: hoveredMy === b.id ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
              boxShadow: hoveredMy === b.id ? "0 6px 24px rgba(74,122,73,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
              cursor: "pointer", transition: "all .2s ease",
              transform: hoveredMy === b.id ? "translateY(-2px)" : "none",
              position: "relative", overflow: "hidden",
            }}>

            <div style={{ position: "absolute", top: 14, right: 14, background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>
              {b.status}
            </div>

            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 60 }}>{b.name}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{b.category}</div>

            <StarRating rating={b.rating} />
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>({b.reviews})</span>

            {hoveredMy === b.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {b.tags.map(t => (
                    <span key={t} style={{ background: C.greenSubtle, color: C.textMuted, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[
                    { label: "Order Freq", value: b.orderFreq },
                    { label: "Pay Cycle",  value: b.paymentCycle },
                    { label: "On-Time",    value: b.onTimePay },
                    { label: "Since",      value: b.since },
                  ].map(m => (
                    <div key={m.label} style={{ fontSize: 11, color: C.textDim }}>
                      {m.label}: <span style={{ fontWeight: 600, color: C.text }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: C.green, fontWeight: 600 }}>Click to view full details</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recommended Businesses */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Recommended Businesses</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Ranked by reviews · Hover to preview · Click for full profile</div>
        </div>
        <input
          placeholder="Search businesses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px",
            fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
            width: 220, color: C.text, background: C.bg,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
            border: `1px solid ${categoryFilter === cat ? C.green : C.border}`,
            background: categoryFilter === cat ? C.green : C.card,
            color: categoryFilter === cat ? "#fff" : C.textDim,
            fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, transition: "all .12s",
          }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {filteredRec.map((b, idx) => (
          <div key={b.id}
            onMouseEnter={() => setHoveredRec(b.id)}
            onMouseLeave={() => setHoveredRec(null)}
            onClick={() => openBusiness(b, false)}
            style={{
              background: C.card, borderRadius: 12, padding: "20px",
              border: hoveredRec === b.id ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
              boxShadow: hoveredRec === b.id ? "0 6px 24px rgba(74,122,73,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
              cursor: "pointer", transition: "all .2s ease",
              transform: hoveredRec === b.id ? "translateY(-2px)" : "none",
              position: "relative", overflow: "hidden",
            }}>

            <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ ...syne, background: idx === 0 ? C.green : idx === 1 ? "#c8a030" : C.bg, color: idx < 2 ? "#fff" : C.textDim, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${idx < 2 ? "transparent" : C.border}` }}>
                #{b.rank}
              </span>
              {b.badge && (
                <span style={{ background: C.greenSubtle, color: C.green, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: `1px solid ${C.greenBorder}` }}>
                  {b.badge}
                </span>
              )}
            </div>

            <div style={{ ...syne, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 60 }}>{b.name}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{b.category} · {b.location}</div>

            <StarRating rating={b.rating} />
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>({b.reviews} reviews)</span>

            {hoveredRec === b.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 }}>{b.desc}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {b.tags.map(t => (
                    <span key={t} style={{ background: C.greenSubtle, color: C.textMuted, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                  {[
                    { label: "Orders",    value: b.orderFreq },
                    { label: "Pay Cycle", value: b.paymentCycle },
                    { label: "On-Time",   value: b.onTimePay },
                  ].map(m => (
                    <div key={m.label} style={{ fontSize: 11, color: C.textDim, textAlign: "center", background: C.bg, borderRadius: 6, padding: "6px" }}>
                      <div>{m.label}</div>
                      <div style={{ fontWeight: 700, color: C.green, marginTop: 2 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Click to view full profile</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedBusiness && (
        <BusinessDetailModal
          business={selectedBusiness}
          isMyBusiness={isMyBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}

    </div>
  );
}
