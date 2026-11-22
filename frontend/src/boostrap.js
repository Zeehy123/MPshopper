import { db } from "./db";
import { sync } from "./sync";

export async function bootstrap() {
  // ask the browser not to delete our data when storage runs low
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }

  const firstRun = !(await db.meta.get("cursor"));
  const job = sync().catch((e) => console.warn("Sync skipped:", e.message));

  // first run: wait briefly so the first screen has data; otherwise sync in the background
  if (firstRun)
    await Promise.race([job, new Promise((r) => setTimeout(r, 8000))]);

  window.addEventListener("online", () => sync().catch(() => {}));
}
