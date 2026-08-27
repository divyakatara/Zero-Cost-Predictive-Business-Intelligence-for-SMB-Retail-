// Frontend-only persistence for business registrations.
// Swap these functions for real API calls once you have a backend —
// nothing else in the app needs to change if you keep the same function names.

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
}

export function getBusinessByEmail(email) {
  return getBusinesses().find((b) => b.userEmail === email) || null;
}

// Called right after BRegisterBusinessPage is submitted
export function submitBusiness(userEmail, formData) {
  const businesses = getBusinesses();
  const record = {
    ...formData,
    userEmail,
    status: "pending", // "pending" | "approved" | "rejected"
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    rejectionReason: null,
  };
  const updated = [...businesses.filter((b) => b.userEmail !== userEmail), record];
  saveBusinesses(updated);
  return record;
}

export function approveBusiness(userEmail) {
  const updated = getBusinesses().map((b) =>
    b.userEmail === userEmail
      ? { ...b, status: "approved", reviewedAt: new Date().toISOString(), rejectionReason: null }
      : b
  );
  saveBusinesses(updated);
}

export function rejectBusiness(userEmail, reason) {
  const updated = getBusinesses().map((b) =>
    b.userEmail === userEmail
      ? { ...b, status: "rejected", reviewedAt: new Date().toISOString(), rejectionReason: reason || "Details could not be verified." }
      : b
  );
  saveBusinesses(updated);
}
