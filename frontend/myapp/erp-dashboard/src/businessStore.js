// Frontend persistence & sync for business registrations.

const STORAGE_KEY = "smarterp_businesses";

export function getBusinesses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBusinesses(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Notify same window of changes
  window.dispatchEvent(new CustomEvent("smarterp_businesses_updated"));
}

export function getBusinessByEmail(email) {
  if (!email) return null;
  return getBusinesses().find((b) => (b.userEmail || b.email || "").toLowerCase() === email.toLowerCase()) || null;
}

// Called right after BRegisterBusinessPage is submitted
export function submitBusiness(userEmail, formData) {
  const businesses = getBusinesses();
  const record = {
    ...formData,
    userEmail: userEmail || formData.email,
    status: "pending", // "pending" | "approved" | "rejected"
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    rejectionReason: null,
  };
  const updated = [...businesses.filter((b) => (b.userEmail || "").toLowerCase() !== (userEmail || "").toLowerCase()), record];
  saveBusinesses(updated);
  return record;
}

export function approveBusiness(userEmail) {
  const updated = getBusinesses().map((b) =>
    (b.userEmail || "").toLowerCase() === (userEmail || "").toLowerCase()
      ? { ...b, status: "approved", reviewedAt: new Date().toISOString(), rejectionReason: null }
      : b
  );
  saveBusinesses(updated);
}

export function rejectBusiness(userEmail, reason) {
  const updated = getBusinesses().map((b) =>
    (b.userEmail || "").toLowerCase() === (userEmail || "").toLowerCase()
      ? { ...b, status: "rejected", reviewedAt: new Date().toISOString(), rejectionReason: reason || "Details could not be verified." }
      : b
  );
  saveBusinesses(updated);
}

export function revokeBusiness(userEmail) {
  const updated = getBusinesses().map((b) =>
    (b.userEmail || "").toLowerCase() === (userEmail || "").toLowerCase()
      ? { ...b, status: "pending", reviewedAt: new Date().toISOString(), rejectionReason: "Approval revoked by Admin." }
      : b
  );
  saveBusinesses(updated);
}

export function subscribeBusinessChanges(callback) {
  const handler = () => callback(getBusinesses());
  window.addEventListener("storage", handler);
  window.addEventListener("smarterp_businesses_updated", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("smarterp_businesses_updated", handler);
  };
}
