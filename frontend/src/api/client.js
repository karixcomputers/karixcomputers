export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

console.log("%c🚀 Karix API:", "color: #00ff00; font-weight: bold;", API_URL);

let accessToken = null;

export function setAccessToken(t) { 
  accessToken = t; 
}

export function getAccessToken() { 
  return accessToken; 
}

/**
 * apiFetch - Gestionează cererile HTTP și auto-refresh-ul silențios
 */
export async function apiFetch(path, options = {}) {
  // --- MODIFICARE AICI ---
  // Nu punem Content-Type dacă body-ul este de tip FormData (imagini)
  const isFormData = options.body instanceof FormData;
  
  const headers = { 
    ...(isFormData ? {} : { "Content-Type": "application/json" }), 
    ...(options.headers || {}) 
  };
  
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // 1. Dacă primim 401 și nu suntem deja pe ruta de refresh
    if (res.status === 401 && path !== "/api/auth/refresh") {
      
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (r.ok) {
        const data = await r.json();
        
        setAccessToken(data.accessToken);
        
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("karix_logged_in", "true");

        // Reîncercăm cererea inițială
        return apiFetch(path, options);
      } else {
        setAccessToken(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("karix_logged_in");
        
        if (path.includes("/auth/me")) {
          return new Response(JSON.stringify({ user: null }), { status: 200 });
        }
      }
    }

    return res;
  } catch (err) {
    console.error("🌐 Eroare rețea:", err.message);
    throw err;
  }
}