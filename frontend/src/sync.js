import { db, now } from "./db";
import { liveQuery } from "dexie";
import { authHeaders, getToken, clearAuth } from "./auth";
const BASE = import.meta.env.VITE_API_URL;
const ORDER = [
  "categories",
  "stores",
  "products",
  "priceHistory",
  "trips",
  "tripItems",
];

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(70000),
  });
  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event("auth-expired"));
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Sync failed (${res.status})`);
  }
  return res.json();
}

const toWire = {
  categories: (r) => ({ id: r.id, name: r.name, updated_at: r.updatedAt }),
  stores: (r) => ({
    id: r.id,
    name: r.name,
    location: r.location ?? "",
    updated_at: r.updatedAt,
  }),
  products: (r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    category_id: r.categoryId,
    default_quantity: r.defaultQuantity,
    current_price: r.currentPrice,
    updated_at: r.updatedAt,
  }),
  priceHistory: (r) => ({
    id: r.id,
    product_id: r.productId,
    store_id: r.storeId,
    price: r.price,
    recorded_at: r.recordedAt,
    updated_at: r.updatedAt,
  }),
  trips: (r) => ({
    id: r.id,
    store_id: r.storeId,
    date: r.date,
    budget: r.budget ?? null,
    is_completed: r.isCompleted,
    updated_at: r.updatedAt,
  }),
  tripItems: (r) => ({
    id: r.id,
    trip_id: r.tripId,
    product_id: r.productId ?? null,
    product_name: r.productName ?? "",
    product_unit: r.productUnit ?? "",
    quantity: r.quantity,
    price_paid: r.pricePaid,
    is_checked: !!r.checked,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }),
};

// ---------- what the server sent -> ----------
const fromWire = {
  categories: (w) => ({ id: w.id, name: w.name, updatedAt: w.modified_at }),
  stores: (w) => ({
    id: w.id,
    name: w.name,
    location: w.location,
    updatedAt: w.modified_at,
  }),
  products: (w, old, images) => ({
    id: w.id,
    name: w.name,
    unit: w.unit,
    categoryId: w.category_id,
    defaultQuantity: Number(w.default_quantity),
    currentPrice: Number(w.current_price),

    image: images[w.id] ?? old?.image ?? null,
    imageUrl: w.image ?? old?.imageUrl ?? null,
    imagePending: old?.imagePending ?? false,
    imageVersion: images[w.id]
      ? (old?.imageVersion ?? 0) + 1
      : (old?.imageVersion ?? 1),
    createdAt: old?.createdAt ?? w.modified_at,
    updatedAt: w.modified_at,
  }),
  priceHistory: (w) => ({
    id: w.id,
    productId: w.product_id,
    storeId: w.store_id,
    price: Number(w.price),
    recordedAt: w.recorded_at,
    updatedAt: w.modified_at,
  }),
  trips: (w) => ({
    id: w.id,
    storeId: w.store_id,
    date: w.date,
    budget: w.budget === null ? null : Number(w.budget),
    isCompleted: w.is_completed,
    updatedAt: w.modified_at,
  }),
  tripItems: (w) => ({
    id: w.id,
    tripId: w.trip_id,
    productId: w.product_id ?? null,
    productName: w.product_name ?? "",
    productUnit: w.product_unit ?? "",
    quantity: Number(w.quantity),
    pricePaid: Number(w.price_paid),
    checked: !!w.is_checked,
    createdAt: w.created_at,
    updatedAt: w.modified_at,
  }),
};
async function uploadImages() {
  const waiting = (await db.products.toArray()).filter(
    (p) => p.imagePending && p.image,
  );
  let uploaded = 0;
  for (const p of waiting) {
    const form = new FormData();
    const ext =
      (p.image.type || "image/jpeg").split("/")[1]?.split("+")[0] || "jpg";
    form.append("image", p.image, `${p.id}.${ext}`);
    try {
      const res = await fetch(`${BASE}/sync/image/${p.id}/`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) continue; // try again on the next sync
      const { image } = await res.json();
      await db.products.update(p.id, { imagePending: false, imageUrl: image });
      uploaded++;
    } catch {
      /* try again on the next sync */
    }
  }
  return uploaded;
}
// ---------- send local changes ----------
async function push() {
  const entries = await db.outbox.orderBy("seq").toArray();
  if (!entries.length) return 0;

  const latest = new Map();
  for (const e of entries) latest.set(`${e.table}:${e.recordId}`, e);

  const upserts = {};
  const deletes = [];
  for (const e of latest.values()) {
    if (e.op === "delete") {
      deletes.push({ table: e.table, id: e.recordId });
      continue;
    }
    const record = await db[e.table].get(e.recordId);
    if (!record) continue;
    (upserts[e.table] ??= []).push(toWire[e.table](record));
  }

  await call("/sync/push/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upserts, deletes }),
  });

  await db.outbox.bulkDelete(entries.map((e) => e.seq));
  return entries.length;
}
let running = null;
export function sync() {
  if (!getToken()) return Promise.reject(new Error("Not logged in."));
  if (!navigator.onLine) return Promise.reject(new Error("You are offline."));
  running ??= (async () => {
    const pushed = await push();
    const uploaded = await uploadImages(); // after push, so the product exists on the server
    const pulled = await pull();
    await db.meta.put({ key: "lastSync", value: now() });
    return { pushed, uploaded, pulled };
  })().finally(() => {
    running = null;
  });
  return running;
}
// ---------- receive server changes ----------
async function pull() {
  const cursor = (await db.meta.get("cursor"))?.value;
  const data = await call(
    `/sync/pull/${cursor ? `?since=${encodeURIComponent(cursor)}` : ""}`,
  );

  // never overwrite a record that has an unsent local change
  const pending = new Set(
    (await db.outbox.toArray()).map((e) => `${e.table}:${e.recordId}`),
  );

  // download new pictures first
  const images = {};
  for (const w of data.changes.products ?? []) {
    if (!w.image) continue;
    const old = await db.products.get(w.id);
    if (old?.imageUrl === w.image) continue;
    try {
      images[w.id] = await (await fetch(w.image)).blob();
    } catch {}
  }

  let changed = 0;
  await db.transaction("rw", db.tables, async () => {
    for (const table of ORDER) {
      for (const w of data.changes[table] ?? []) {
        if (pending.has(`${table}:${w.id}`)) continue;
        const old = await db[table].get(w.id);
        await db[table].put(fromWire[table](w, old, images)); // plain put: no outbox entry
        changed++;
      }
    }
    for (const d of data.deleted ?? []) {
      if (pending.has(`${d.table}:${d.id}`)) continue;
      await db[d.table].delete(d.id);
      changed++;
    }
    await db.meta.put({ key: "cursor", value: data.cursor });
  });
  return changed;
}

// ---------- live status for the UI ----------
const listeners = new Set();
let state = {
  online: navigator.onLine,
  syncing: false,
  error: "",
  pending: 0,
  lastSync: null,
  dataVersion: 0, // goes up whenever new data arrives from the server
};
const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getSyncState = () => state;

let timer = null;
export function scheduleSync(delay = 3000) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

export async function syncNow() {
  if (!navigator.onLine || !getToken()) return;
  setState({ syncing: true });
  let ok = false;
  try {
    const result = await sync();
    ok = true;
    setState({
      error: "",
      lastSync: new Date(),
      dataVersion:
        result.pulled > 0 ? state.dataVersion + 1 : state.dataVersion,
    });
  } catch (e) {
    setState({ error: e.message });
  } finally {
    setState({ syncing: false });
    // changes made while we were syncing still need sending
    if (ok && (await db.outbox.count()) > 0) scheduleSync(1000);
  }
}

let started = false;
export function startAutoSync() {
  if (started) return;
  started = true;

  window.addEventListener("online", () => {
    setState({ online: true });
    syncNow();
  });
  window.addEventListener("offline", () => setState({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncNow();
  });
  setInterval(() => {
    if (!document.hidden) syncNow();
  }, 60000);

  // every local change (an outbox entry) schedules a sync a few seconds later
  db.outbox.hook("creating", () => {
    scheduleSync();
  });
  liveQuery(() => db.outbox.count()).subscribe({
    next: (pending) => setState({ pending }),
  });

  syncNow();
}
