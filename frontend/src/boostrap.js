import { db, newId, now } from "./db";
import { api as remote } from "./remote";

export async function bootstrap() {
  // ask the browser not to delete our data when storage runs low
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }

  if (await db.meta.get("imported")) return;

  // only skip if products already exist locally (an empty cart must not block it)
  if ((await db.products.count()) > 0) {
    await db.meta.put({ key: "imported", value: now() });
    return;
  }
  if (!navigator.onLine) return; // try again on the next launch

  try {
    await importFromServer();
  } catch (e) {
    console.warn("Import skipped:", e.message);
  }
}

async function importFromServer() {
  const [cats, stores, products, history, trips] = await Promise.all([
    remote.getCategories(),
    remote.getStores(),
    remote.getProducts(),
    remote.getAllPriceHistory(),
    remote.getTrips(),
  ]);

  // download pictures first (network calls can't happen inside a transaction)
  const blobs = {};
  await Promise.all(
    products.map(async (p) => {
      if (!p.image) return;
      try {
        blobs[p.id] = await (await fetch(p.image)).blob();
      } catch {
        /* skip this picture */
      }
    }),
  );

  // the server uses numbers for ids; locally every record gets its own unique id
  const ids = (rows) => new Map(rows.map((r) => [r.id, newId()]));
  const catIds = ids(cats),
    storeIds = ids(stores),
    productIds = ids(products),
    tripIds = ids(trips);

  await db.transaction("rw", db.tables, async () => {
    await db.categories.bulkPut(
      cats.map((c) => ({
        id: catIds.get(c.id),
        serverId: c.id,
        name: c.name,
        updatedAt: now(),
      })),
    );

    await db.stores.bulkPut(
      stores.map((s) => ({
        id: storeIds.get(s.id),
        serverId: s.id,
        name: s.name,
        location: s.location,
        updatedAt: now(),
      })),
    );

    await db.products.bulkPut(
      products.map((p) => ({
        id: productIds.get(p.id),
        serverId: p.id,
        name: p.name,
        unit: p.unit,
        categoryId: p.category ? catIds.get(p.category) : null,
        defaultQuantity: Number(p.default_quantity),
        currentPrice: Number(p.current_price),
        image: blobs[p.id] ?? null,
        imageVersion: 1,
        createdAt: p.created_at,
        updatedAt: now(),
      })),
    );

    await db.priceHistory.bulkPut(
      history
        .filter((h) => productIds.has(h.product))
        .map((h) => ({
          id: newId(),
          serverId: h.id,
          productId: productIds.get(h.product),
          storeId: h.store ? storeIds.get(h.store) : null,
          price: Number(h.price),
          recordedAt: h.recorded_at,
          updatedAt: now(),
        })),
    );

    await db.trips.bulkPut(
      trips.map((t) => ({
        id: tripIds.get(t.id),
        serverId: t.id,
        storeId: t.store ? storeIds.get(t.store) : null,
        date: t.date,
        budget: t.budget === null ? null : Number(t.budget),
        isCompleted: t.is_completed,
        updatedAt: now(),
      })),
    );

    const itemRows = [];
    for (const t of trips) {
      [...t.items]
        .sort((a, b) => a.id - b.id)
        .forEach((i) => {
          if (!productIds.has(i.product)) return;
          itemRows.push({
            id: newId(),
            serverId: i.id,
            tripId: tripIds.get(t.id),
            productId: productIds.get(i.product),
            quantity: Number(i.quantity),
            pricePaid: Number(i.price_paid),
            createdAt: now(),
            updatedAt: now(),
          });
        });
    }
    await db.tripItems.bulkPut(itemRows);

    await db.meta.put({ key: "imported", value: now() });
  });
}
