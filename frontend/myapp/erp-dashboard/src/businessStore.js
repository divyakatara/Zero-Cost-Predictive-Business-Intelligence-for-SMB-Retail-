// Frontend persistence & sync for business registrations.

import {
  registerBusinessApi,
  fetchBusinessByEmailApi,
} from "./api";

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

const sameEmail = (a, b) => (a || "").toLowerCase() === (b || "").toLowerCase();

function findLocal(email) {
  return getBusinesses().find((b) => sameEmail(b.userEmail || b.email, email)) || null;
}

// Insert or replace this owner's record without dropping other businesses,
// which the admin page (same browser) still lists from this cache.
function upsertLocal(record) {
  const others = getBusinesses().filter((b) => !sameEmail(b.userEmail, record.userEmail));
  saveBusinesses([...others, record]);
}

// Backend timestamps are UTC without a zone suffix.
const toTime = (value) => (value ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`).getTime() : 0);

export async function getBusinessByEmail(email) {
  if (!email) return null;

  let business;
  try {
    business = await fetchBusinessByEmailApi(email);
  } catch {
    // Fallback to existing localStorage data if the API is unavailable
    return findLocal(email);
  }
  if (!business) return null;

  const local = findLocal(email);
  // userEmail is the owner's login email: the admin page approves/rejects by it.
  const merged = { ...local, ...business, userEmail: email };

  // Approve/reject is still recorded in this browser until the admin API
  // (TASK-07) exists, so an admin decision made after the latest submission wins.
  if (local?.reviewedAt && !business.reviewedAt && toTime(local.reviewedAt) >= toTime(business.submittedAt)) {
    merged.status = local.status;
    merged.reviewedAt = local.reviewedAt;
    merged.rejectionReason = local.rejectionReason;
  }

  upsertLocal(merged);
  return merged;
}

// Called right after BRegisterBusinessPage is submitted
export async function submitBusiness(userEmail, formData) {
  const saved = await registerBusinessApi(formData, userEmail);

  // Keep a local copy for the admin page, including the uploaded certificate
  // (only its name is stored on the server).
  const record = {
    ...saved,
    userEmail,
    gstCertificateData: formData.gstCertificateData || null,
  };
  upsertLocal(record);
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
