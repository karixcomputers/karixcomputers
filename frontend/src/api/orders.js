import { apiFetch } from "./client";

export async function fetchMyOrders() {
  // MODIFICAT: din "/orders" în "/orders"
  const res = await apiFetch("/orders");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load orders");
  return data;
}

// FUNCȚIA DE ANULARE CORECTATĂ:
export async function cancelOrder(orderId) {
  // MODIFICAT: din "/orders/..." în "/orders/..."
  const res = await apiFetch(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Nu s-a putut anula comanda");
  return data;
}