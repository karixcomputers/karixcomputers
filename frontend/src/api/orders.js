import { apiFetch } from "./client";

export async function fetchMyOrders() {
  const res = await apiFetch("/api/orders");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load orders");
  return data;
}

// ADAUGĂ ACEASTĂ FUNCȚIE:
export async function cancelOrder(orderId) {
  const res = await apiFetch(`/api/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Nu s-a putut anula comanda");
  return data;
}