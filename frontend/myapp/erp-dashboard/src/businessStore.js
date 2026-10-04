// Business registrations and admin review decisions, stored on the server so
// they are the same in every browser.

import { fetchJson, registerBusinessApi, fetchBusinessByEmailApi, uploadGstCertificateApi } from "./api";

export async function getBusinessByEmail(email) {
  if (!email) return null;
  return fetchBusinessByEmailApi(email);
}

// Called right after BRegisterBusinessPage is submitted
export async function submitBusiness(userEmail, formData) {
  const saved = await registerBusinessApi(formData, userEmail);
  if (formData.gstCertificateFile) {
    return uploadGstCertificateApi(saved.id, formData.gstCertificateFile);
  }
  return saved;
}

export async function listBusinessesForAdmin() {
  return fetchJson("/business/admin/all");
}

export async function approveBusiness(businessId) {
  return fetchJson(`/business/${businessId}/approve`, { method: "POST" });
}

export async function rejectBusiness(businessId, reason) {
  return fetchJson(`/business/${businessId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function revokeBusiness(businessId) {
  return fetchJson(`/business/${businessId}/revoke`, { method: "POST" });
}
