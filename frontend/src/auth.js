const BASE = import.meta.env.VITE_API_URL;
const KEY = "gs_auth";

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export const getToken = () => getAuth()?.token ?? null;
export const setAuth = (auth) =>
  localStorage.setItem(KEY, JSON.stringify(auth));
export const clearAuth = () => localStorage.removeItem(KEY);

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
};

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed.");
  return data;
}

export const loginRequest = (username, password) =>
  post("/auth/login/", { username, password });
export const registerRequest = (username, password) =>
  post("/auth/register/", { username, password });

export async function updateProfileRequest(data) {
  let res;
  try {
    res = await fetch(`${BASE}/auth/profile/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Profile update failed.");
  return result;
}
