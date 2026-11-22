import { db, now } from "./db";

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
    signal: AbortSignal.timeout(20000),
  });
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
    product_id: r.productId,
    quantity: r.quantity,
    price_paid: r.pricePaid,
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
    productId: w.product_id,
    quantity: Number(w.quantity),
    pricePaid: Number(w.price_paid),
    createdAt: w.created_at,
    updatedAt: w.modified_at,
  }),
};

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

let running = null;
export function sync() {
  if (!navigator.onLine) return Promise.reject(new Error("You are offline."));
  running ??= (async () => {
    const pushed = await push();
    const pulled = await pull();
    await db.meta.put({ key: "lastSync", value: now() });
    return { pushed, pulled };
  })().finally(() => {
    running = null;
  });
  return running;
}
