// În src/api/auth.js
export async function refreshApi() {
  const res = await apiFetch("/api/auth/refresh", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Refresh failed");
  setAccessToken(data.accessToken);
  return data;
}