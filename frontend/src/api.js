import { db, tx, newId, now, save, remove } from "./db";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const fail = (msg) => {
  throw new Error(msg);
};

async function must(table, id, label) {
  const row = await db[table].get(id);
  if (!row) fail(`${label} not found.`);
  return row;
}

// a trip item whose product was deleted has no productId to look up
const productOf = (id) => (id ? db.products.get(id) : Promise.resolve(undefined));

// ---------- images: -> URLs for <img> ----------
const urlCache = new Map();
function imageUrl(p) {
  if (!p?.image) return p?.imageUrl || null;
  const hit = urlCache.get(p.id);
  if (hit && hit.version === p.imageVersion) return hit.url;
  if (hit) URL.revokeObjectURL(hit.url);
  const url = URL.createObjectURL(p.image);
  urlCache.set(p.id, { version: p.imageVersion, url });
  return url;
}

async function productOut(p) {
  const hist = await db.priceHistory
    .where("productId")
    .equals(p.id)
    .sortBy("recordedAt");
  hist.reverse(); // newest first
  const previous = hist.length > 1 ? hist[1].price : null;
  let trend = "same";
  if (previous !== null && previous !== p.currentPrice) {
    trend = p.currentPrice > previous ? "up" : "down";
  }
  const category = p.categoryId ? await db.categories.get(p.categoryId) : null;
  return {
    id: p.id,
    name: p.name,
    image: imageUrl(p),
    category: p.categoryId,
    category_name: category?.name ?? null,
    unit: p.unit,
    default_quantity: p.defaultQuantity,
    current_price: p.currentPrice,
    previous_price: previous,
    price_trend: trend,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

async function itemOut(i) {
  const p = await productOf(i.productId);
  return {
    id: i.id,
    trip: i.tripId,
    product: i.productId,
    // a deleted product's name was copied onto the item when it was deleted
    product_name: p?.name || i.productName || "Deleted product",
    product_unit: p?.unit || i.productUnit || "",
    product_image: imageUrl(p),
    quantity: i.quantity,
    price_paid: i.pricePaid,
    line_total: round2(i.quantity * i.pricePaid),
    checked: !!i.checked,
  };
}

async function tripOut(t) {
  const rows = await db.tripItems.where("tripId").equals(t.id).toArray();
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const items = await Promise.all(rows.map(itemOut));
  const total = round2(items.reduce((sum, i) => sum + i.line_total, 0));
  const store = t.storeId ? await db.stores.get(t.storeId) : null;
  const budget = t.budget || null;

  let status = "none";
  if (budget)
    status = total > budget ? "over" : total >= budget * 0.9 ? "near" : "ok";

  return {
    id: t.id,
    store: t.storeId,
    store_name: store?.name ?? null,
    date: t.date,
    budget,
    is_completed: t.isCompleted,
    items,
    total,
    over_budget: budget !== null && total > budget,
    remaining: budget === null ? null : round2(budget - total),
    budget_status: status,
  };
}

// ---------- the cart (open trip) ----------
async function findOrCreateCart() {
  const open = (await db.trips.toArray())
    .filter((t) => !t.isCompleted)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (open) return tripOut(open);
  const trip = {
    id: newId(),
    storeId: null,
    date: now(),
    budget: null,
    isCompleted: false,
  };
  await tx(() => save("trips", trip));
  return tripOut(trip);
}
let cartRequest = null; // stops two simultaneous calls creating two carts

async function assertEditable(tripId) {
  const trip = await must("trips", tripId, "Trip");
  if (trip.isCompleted)
    fail("This trip is already completed and cannot be changed.");
  return trip;
}

const localApi = {
  // ----- products -----
  getProducts: async (query = "") => {
    const params = new URLSearchParams(query);
    const search = (params.get("search") || "").toLowerCase();
    const category = params.get("category");
    let list = await db.products.toArray();
    if (search)
      list = list.filter((p) => p.name.toLowerCase().includes(search));
    if (category) list = list.filter((p) => p.categoryId === category);
    list.sort((a, b) => a.name.localeCompare(b.name));
    return Promise.all(list.map(productOut));
  },

  getProduct: async (id) => productOut(await must("products", id, "Product")),

  createProduct: async (fd) => {
    const name = String(fd.get("name") || "").trim();
    const unit = String(fd.get("unit") || "").trim();
    const price = Number(fd.get("current_price"));
    const qty = Number(fd.get("default_quantity") || 1);
    if (!name) fail("Name is required.");
    if (!unit) fail("Unit is required.");
    if (!(price > 0)) fail("Price must be above zero.");
    if (!(qty > 0)) fail("Quantity must be above zero.");

    const image = fd.get("image");
    const product = {
      id: newId(),
      name,
      unit,
      defaultQuantity: qty,
      currentPrice: price,
      categoryId: fd.get("category") || null,
      image: image instanceof Blob ? image : null,
      imagePending: image instanceof Blob,
      imageVersion: 1,
      createdAt: now(),
    };
    await tx(async () => {
      await save("products", product);
      await save("priceHistory", {
        id: newId(),
        productId: product.id,
        storeId: fd.get("store") || null,
        price,
        recordedAt: now(),
      });
    });
    return productOut(product);
  },

  updateProduct: async (id, data) => {
    const product = await must("products", id, "Product");
    let priceChanged = false;

    if ("name" in data) {
      const name = String(data.name || "").trim();
      if (!name) fail("Name is required.");
      product.name = name;
    }
    if ("unit" in data) {
      const unit = String(data.unit || "").trim();
      if (!unit) fail("Unit is required.");
      product.unit = unit;
    }
    if ("default_quantity" in data) {
      const qty = Number(data.default_quantity);
      if (!(qty > 0)) fail("Quantity must be above zero.");
      product.defaultQuantity = qty;
    }
    if ("category" in data) product.categoryId = data.category || null;
    if ("current_price" in data) {
      const price = Number(data.current_price);
      if (!(price > 0)) fail("Price must be above zero.");
      priceChanged = price !== product.currentPrice;
      product.currentPrice = price;
    }
    if (data.image instanceof Blob) {
      product.image = data.image;
      product.imagePending = true; // uploaded on the next sync
      product.imageVersion = (product.imageVersion ?? 1) + 1;
    }

    await tx(async () => {
      await save("products", product);
      if (priceChanged) {
        await save("priceHistory", {
          id: newId(),
          productId: id,
          storeId: data.store || null,
          price: product.currentPrice,
          recordedAt: now(),
        });
      }
    });
    return productOut(product);
  },

  // Removes the product and its price history. Items in the open cart go too;
  // finished trips keep their lines, with the product's name copied onto them.
  deleteProduct: async (id) => {
    const product = await must("products", id, "Product");
    await tx(async () => {
      const items = await db.tripItems.where("productId").equals(id).toArray();
      for (const item of items) {
        const trip = await db.trips.get(item.tripId);
        if (trip && !trip.isCompleted) {
          await remove("tripItems", item);
        } else {
          item.productName = product.name;
          item.productUnit = product.unit;
          await save("tripItems", item);
        }
      }
      const prices = await db.priceHistory.where("productId").equals(id).toArray();
      for (const h of prices) await remove("priceHistory", h);
      await remove("products", product);
    });
    const hit = urlCache.get(id);
    if (hit) {
      URL.revokeObjectURL(hit.url);
      urlCache.delete(id);
    }
    return null;
  },

  // ----- categories and stores -----
  getCategories: async () =>
    (await db.categories.orderBy("name").toArray()).map((c) => ({
      id: c.id,
      name: c.name,
    })),

  createCategory: async ({ name }) => {
    const clean = String(name || "").trim();
    if (!clean) fail("Name is required.");
    if (await db.categories.where("name").equalsIgnoreCase(clean).count()) {
      fail("That category already exists.");
    }
    const c = { id: newId(), name: clean };
    await tx(() => save("categories", c));
    return { id: c.id, name: c.name };
  },

  getStores: async () =>
    (await db.stores.orderBy("name").toArray()).map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location ?? "",
    })),

  createStore: async ({ name, location = "" }) => {
    const clean = String(name || "").trim();
    if (!clean) fail("Name is required.");
    const s = { id: newId(), name: clean, location };
    await tx(() => save("stores", s));
    return { id: s.id, name: s.name, location: s.location };
  },

  // ----- price history -----
  getPriceHistory: async (productId) => {
    const stores = Object.fromEntries(
      (await db.stores.toArray()).map((s) => [s.id, s.name]),
    );
    const rows = await db.priceHistory
      .where("productId")
      .equals(productId)
      .sortBy("recordedAt");
    return rows.reverse().map((h) => ({
      id: h.id,
      product: h.productId,
      store: h.storeId,
      store_name: stores[h.storeId] ?? null,
      price: h.price,
      recorded_at: h.recordedAt,
    }));
  },

  // latest price per store, cheapest first
  getStorePrices: async (productId) => {
    const stores = Object.fromEntries(
      (await db.stores.toArray()).map((s) => [s.id, s.name]),
    );
    const rows = await db.priceHistory
      .where("productId")
      .equals(productId)
      .sortBy("recordedAt");
    const latest = new Map();
    for (const h of rows) latest.set(h.storeId ?? "none", h); // newer entries overwrite
    return [...latest.values()]
      .map((h) => ({
        store: stores[h.storeId] ?? "Unknown",
        price: h.price,
        recorded_at: h.recordedAt,
      }))
      .sort((a, b) => a.price - b.price);
  },

  // ----- cart and trips -----
  getCart: () => {
    cartRequest ??= findOrCreateCart().finally(() => {
      cartRequest = null;
    });
    return cartRequest;
  },

  updateTrip: async (id, data) => {
    const trip = await assertEditable(id);
    if ("budget" in data) {
      if (data.budget === null || data.budget === "") trip.budget = null;
      else if (Number(data.budget) < 0) fail("Budget cannot be negative.");
      else trip.budget = Number(data.budget);
    }
    if ("store" in data) trip.storeId = data.store || null;
    await tx(() => save("trips", trip));
    return tripOut(trip);
  },

  addItem: async ({ trip, product, quantity }) => {
    await assertEditable(trip);
    const p = await must("products", product, "Product");
    const qty = Number(quantity);
    if (!(qty > 0)) fail("Quantity must be more than zero.");
    const item = {
      id: newId(),
      tripId: trip,
      productId: product,
      productName: p.name,
      productUnit: p.unit,
      quantity: qty,
      pricePaid: p.currentPrice,
      checked: false,
      createdAt: now(),
    };
    await tx(() => save("tripItems", item));
    return itemOut(item);
  },

  updateItem: async (id, data) => {
    const item = await must("tripItems", id, "Item");
    await assertEditable(item.tripId);
    if ("quantity" in data) {
      if (!(Number(data.quantity) > 0))
        fail("Quantity must be more than zero.");
      item.quantity = Number(data.quantity);
    }
    if ("price_paid" in data) {
      if (!(Number(data.price_paid) > 0)) fail("Price must be more than zero.");
      item.pricePaid = Number(data.price_paid);
    }
    if ("checked" in data) item.checked = !!data.checked;
    await tx(() => save("tripItems", item));
    return itemOut(item);
  },

  removeItem: async (id) => {
    const item = await must("tripItems", id, "Item");
    await assertEditable(item.tripId);
    await tx(() => remove("tripItems", item));
    return null;
  },

  completeTrip: async (id, data = {}) => {
    const trip = await must("trips", id, "Trip");
    if (trip.isCompleted) fail("Trip already completed.");
    const items = await db.tripItems.where("tripId").equals(id).toArray();
    if (!items.length) fail("The cart is empty.");

    await tx(async () => {
      if (data.store) trip.storeId = data.store;
      trip.isCompleted = true;
      trip.date = now();
      await save("trips", trip);

      // prices edited during the visit become the product's new price
      for (const item of items) {
        const product = await productOf(item.productId);
        if (product && item.pricePaid !== product.currentPrice) {
          product.currentPrice = item.pricePaid;
          await save("products", product);
          await save("priceHistory", {
            id: newId(),
            productId: product.id,
            storeId: trip.storeId,
            price: item.pricePaid,
            recordedAt: now(),
          });
        }
      }
    });
    return tripOut(trip);
  },

  getTrips: async (query = "") => {
    const completed = new URLSearchParams(query).get("completed");
    let trips = await db.trips.toArray();
    if (completed !== null)
      trips = trips.filter((t) => t.isCompleted === (completed === "true"));
    trips.sort((a, b) => b.date.localeCompare(a.date));
    return Promise.all(trips.map(tripOut));
  },

  repeatTrip: async (id) => {
    const old = await must("trips", id, "Trip");
    const openTrips = (await db.trips.toArray()).filter((t) => !t.isCompleted);
    for (const t of openTrips) {
      if (await db.tripItems.where("tripId").equals(t.id).count()) {
        fail("Finish or clear your current cart first.");
      }
    }
    const oldItems = await db.tripItems.where("tripId").equals(id).toArray();
    const fresh = {
      id: newId(),
      storeId: old.storeId,
      budget: old.budget ?? null,
      date: now(),
      isCompleted: false,
    };
    await tx(async () => {
      for (const t of openTrips) await remove("trips", t); // empty carts
      await save("trips", fresh);
      for (const i of oldItems) {
        const p = await productOf(i.productId);
        if (!p) continue; // deleted products can't be re-bought
        await save("tripItems", {
          id: newId(),
          tripId: fresh.id,
          productId: p.id,
          quantity: i.quantity,
          pricePaid: p.currentPrice,
          checked: false,
          createdAt: now(),
        });
      }
    });
    return tripOut(fresh);
  },

  // ----- stats -----
  getStats: async () => {
    const trips = (await db.trips.toArray()).filter((t) => t.isCompleted);
    const dateOf = Object.fromEntries(trips.map((t) => [t.id, t.date]));
    const items = (await db.tripItems.toArray()).filter(
      (i) => i.tripId in dateOf,
    );
    const products = Object.fromEntries(
      (await db.products.toArray()).map((p) => [p.id, p]),
    );
    const cats = Object.fromEntries(
      (await db.categories.toArray()).map((c) => [c.id, c.name]),
    );

    let totalSpent = 0;
    const monthly = {},
      byCategory = {},
      top = {};
    for (const i of items) {
      const line = i.quantity * i.pricePaid;
      totalSpent += line;

      const d = new Date(dateOf[i.tripId]);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly[month] = (monthly[month] || 0) + line;

      const p = products[i.productId];
      const cat = (p?.categoryId && cats[p.categoryId]) || "Uncategorised";
      byCategory[cat] = (byCategory[cat] || 0) + line;

      const key = i.productId ?? `deleted:${i.productName}`;
      top[key] ??= {
        product_id: key,
        name: p?.name || i.productName || "Deleted product",
        trips: new Set(),
        total_quantity: 0,
      };
      top[key].trips.add(i.tripId);
      top[key].total_quantity += i.quantity;
    }

    return {
      total_spent: round2(totalSpent),
      trips_completed: trips.length,
      monthly_spending: Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total: round2(total) })),
      spending_by_category: Object.entries(byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([category, total]) => ({ category, total: round2(total) })),
      top_items: Object.values(top)
        .map((t) => ({
          product_id: t.product_id,
          name: t.name,
          times_bought: t.trips.size,
          total_quantity: t.total_quantity,
        }))
        .sort((a, b) => b.times_bought - a.times_bought)
        .slice(0, 10),
    };
  },
};

export const api = localApi;
