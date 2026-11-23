import { Cloud, CloudOff, RefreshCw, CircleAlert } from "lucide-react";
import { useSync } from "../useSync";

export default function SyncStatus() {
  const { online, syncing, error, pending, lastSync, syncNow } = useSync();

  let cls = "ok";
  let Icon = Cloud;
  let text = lastSync
    ? `Synced ${lastSync.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`
    : "Up to date";

  if (!online) {
    cls = "offline";
    Icon = CloudOff;
    text = "Offline";
  } else if (syncing) {
    cls = "syncing";
    Icon = RefreshCw;
    text = "Syncing";
  } else if (error) {
    cls = "error";
    Icon = CircleAlert;
    text = "Sync failed";
  } else if (pending) {
    cls = "pending";
    text = "Waiting to sync";
  }

  const label = pending ? `${text}, ${pending} unsynced change${pending === 1 ? "" : "s"}` : text;

  return (
    <button
      className={`sync-status ${cls}`}
      onClick={syncNow}
      disabled={syncing || !online}
      title={error || "Tap to sync now"}
      aria-label={label}
    >
      <Icon size={16} className={syncing ? "spin" : undefined} aria-hidden="true" />
      <span className="sync-text">{text}</span>
      {pending > 0 && <span className="sync-count">{pending}</span>}
    </button>
  );
}
