import Dexie from "dexie";

export const db = new Dexie("grocery-shopper");

db.version(1).stores({
  categories: "id, name, serverId",
  stores: "id, name, serverId",
  products: "id, name, categoryId, serverId",
  priceHistory: "id, productId, recordedAt, serverId",
  trips: "id, date, serverId",
  tripItems: "id, tripId, productId, serverId",
  outbox: "++seq, table, recordId",
  meta: "key",
});

export const newId = () => crypto.randomUUID();

// timestamps that always increase, so records created together keep their order
let last = 0;
export function now() {
  last = Math.max(Date.now(), last + 1);
  return new Date(last).toISOString();
}

// run several writes together: all succeed or none do
export const tx = (fn) => db.transaction("rw", db.tables, fn);

// write a record and note the change for the sync step (use inside tx)
export async function save(table, record) {
  record.updatedAt = now();
  await db[table].put(record);
  await db.outbox.add({
    table,
    op: "upsert",
    recordId: record.id,
    serverId: record.serverId ?? null,
    at: record.updatedAt,
  });
  return record;
}

export async function remove(table, record) {
  await db[table].delete(record.id);
  await db.outbox.add({
    table,
    op: "delete",
    recordId: record.id,
    serverId: record.serverId ?? null,
    at: now(),
  });
}
