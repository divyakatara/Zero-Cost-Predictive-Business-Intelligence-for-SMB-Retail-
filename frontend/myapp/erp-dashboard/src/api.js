export const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "smarterp_access_token";

// Per-tab storage: each tab keeps its own session (e.g. a business tab and an
// admin tab side by side), and logging out in one tab doesn't sign out the other.
export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401) setAuthToken(null);
  return response;
}

export async function fetchJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Request failed: ${path} (${response.status})`);
  }
  return data;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function errorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (data?.detail?.message) return data.detail.message;
  return fallback;
}

// Optional numeric form fields arrive as "" when left blank; the API expects a number or null.
function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function registerBusinessApi(formData, userEmail) {
  // The certificate file is sent separately by uploadGstCertificateApi.
  // eslint-disable-next-line no-unused-vars
  const { gstCertificateFile, gstCertificateData, hasGstCertificateFile, ...fields } = formData;
  const response = await apiFetch("/business/register", {
    method: "POST",
    body: JSON.stringify({
      ...fields,
      user_email: userEmail,
      yearEstablished: toNumberOrNull(fields.yearEstablished),
      employeeCount: toNumberOrNull(fields.employeeCount),
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(data, "Business registration failed."));
  }
  return data;
}

export async function fetchBusinessByEmailApi(email) {
  const response = await apiFetch(`/business/by-email?email=${encodeURIComponent(email)}`);
  if (response.status === 404) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(data, "Unable to fetch business registration."));
  }
  return data;
}

export async function uploadGstCertificateApi(businessId, file) {
  const body = new FormData();
  body.append("file", file);
  const response = await apiFetch(`/business/${businessId}/gst-certificate`, { method: "POST", body });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage(data, "GST certificate upload failed."));
  }
  return data;
}

// Opens the stored certificate in a new tab. The tab is opened before the
// request so popup blockers treat it as part of the click.
export async function openGstCertificateApi(businessId) {
  const win = window.open("", "_blank");
  try {
    const response = await apiFetch(`/business/${businessId}/gst-certificate`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(errorMessage(data, "Could not load the GST certificate."));
    }
    const url = URL.createObjectURL(await response.blob());
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (err) {
    win?.close();
    throw err;
  }
}
