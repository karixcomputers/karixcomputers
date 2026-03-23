import { apiFetch, setAccessToken } from "./client.js";

/**
 * Verificăm dacă există vreun indiciu că utilizatorul este logat.
 * Ne uităm după cookie-ul indicator SAU după cheile din LocalStorage.
 */
const shouldAttemptRefresh = () => {
  if (typeof window === "undefined") return false;

  const hasCookie = document.cookie.split(';').some((item) => item.trim().startsWith('is_logged_in='));
  const hasLocalFlag = localStorage.getItem("karix_logged_in") === "true";
  const hasLocalToken = !!localStorage.getItem("accessToken");

  return hasCookie || hasLocalFlag || hasLocalToken || window.location.hostname === "localhost";
};

export async function loginApi(email, password) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  
  // Salvăm indicatorii pentru a asigura persistența la refresh
  localStorage.setItem("karix_logged_in", "true");
  localStorage.setItem("accessToken", data.accessToken);
  
  setAccessToken(data.accessToken);
  return data; 
}

export async function registerApi(payload) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Register failed");
  return data;
}

export async function verifyEmailApi(email, code) {
  const res = await apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Cod invalid.");
  
  // Salvăm indicatorii și la verificarea email-ului
  localStorage.setItem("karix_logged_in", "true");
  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
    setAccessToken(data.accessToken);
  }
  
  return data;
}

export const verifyWithCodeApi = verifyEmailApi; 

export async function resendVerificationApi(email) {
  const res = await apiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return await res.json();
}

export async function forgotPasswordApi(email) {
  const res = await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return await res.json();
}

export async function resetPasswordApi(token, newPassword) {
  const res = await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reset failed");
  return data;
}

export async function logoutApi() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    // Curățăm TOT la logout pentru a preveni încercări inutile de refresh
    setAccessToken(null);
    localStorage.removeItem("karix_logged_in");
    localStorage.removeItem("accessToken");
    document.cookie = "is_logged_in=; Max-Age=0; path=/;";
  }
}

/**
 * REFRESH API
 * Încearcă recuperarea sesiunii doar dacă există dovezi ale unei logări anterioare.
 */
export async function refreshApi() {
  if (!shouldAttemptRefresh()) {
    return { user: null, accessToken: null };
  }

  try {
    const res = await apiFetch("/auth/refresh", { method: "POST" });
    
    if (!res.ok) {
      // Dacă serverul respinge refresh-ul, curățăm indicatorii locali
      setAccessToken(null);
      localStorage.removeItem("karix_logged_in");
      localStorage.removeItem("accessToken");
      return { user: null, accessToken: null };
    }

    const data = await res.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      // Actualizăm token-ul în storage pentru siguranță
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("karix_logged_in", "true");
    }
    return data;
  } catch (err) {
    // În caz de eroare de rețea, returnăm nul dar nu ștergem storage-ul
    return { user: null, accessToken: null };
  }
}

/**
 * GET ME
 * Trage datele proaspete ale utilizatorului (inclusiv counts)
 */
export async function getMeApi() {
  const res = await apiFetch("/auth/me", {
    method: "GET",
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch user profile");
  
  return data; // Returnează { user: { ...stats } }
}