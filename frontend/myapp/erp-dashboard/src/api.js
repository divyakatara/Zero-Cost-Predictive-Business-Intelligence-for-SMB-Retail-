export const API_BASE_URL = "http://127.0.0.1:8000";


export async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json();
}


export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}


export async function registerBusinessApi(formData, userEmail) {
  const response = await fetch(`${API_BASE_URL}/business/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_email: userEmail,
      ...formData,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message || "Business registration failed.";

    throw new Error(message);
  }

  return data;
}


export async function fetchBusinessByEmailApi(email) {
  const response = await fetch(
    `${API_BASE_URL}/business/by-email?email=${encodeURIComponent(email)}`
  );

  if (response.status === 404) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to fetch business registration."
    );
  }

  return data;
}
