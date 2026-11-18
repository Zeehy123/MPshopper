const BASE = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || JSON.stringify(err) || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  getProducts: (params = "") => request(`/products/${params}`),
  createProduct: (formData) =>
    request("/products/", { method: "POST", body: formData }),
  updateProduct: (id, data) => request(`/products/${id}/`, json("PATCH", data)),
  getCategories: () => request("/categories/"),
  getStores: () => request("/stores/"),
  getCart: () => request("/trips/cart/"),
  updateTrip: (id, data) => request(`/trips/${id}/`, json("PATCH", data)),
  addItem: (data) => request("/items/", json("POST", data)),
  updateItem: (id, data) => request(`/items/${id}/`, json("PATCH", data)),
  removeItem: (id) => request(`/items/${id}/`, { method: "DELETE" }),
  completeTrip: (id, data = {}) =>
    request(`/trips/${id}/complete/`, json("POST", data)),
  getTrips: () => request("/trips/"),
  repeatTrip: (id) => request(`/trips/${id}/repeat/`, { method: "POST" }),
  getStats: () => request("/stats/"),
};
