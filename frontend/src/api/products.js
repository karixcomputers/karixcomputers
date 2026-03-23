import { apiFetch } from "./client";

export async function fetchProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") qs.set(k, v);
  });

  // MODIFICAT: din "/products..." în "/products..."
  const res = await apiFetch(`/products?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load products");
  return data;
}

export async function fetchProduct(id) {
  // MODIFICAT: din "/products/${id}" în "/products/${id}"
  const res = await apiFetch(`/products/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load product");
  return data;
}