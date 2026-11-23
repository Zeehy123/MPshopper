import { db } from "./db";
import { sync } from "./sync";

export async function bootstrap() {
  // ask the browser not to delete d data when storage runs low
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }

  // after d first run, syncing happens in d background (startAutoSync)
  const firstRun = !(await db.meta.get("cursor"));
  if (!firstRun || !navigator.onLine) return;

  // first run: wait briefly so d first screen already has data
  const job = sync().catch((e) => console.warn("Sync skipped:", e.message));
  await Promise.race([job, new Promise((r) => setTimeout(r, 8000))]);
}
