import { useSyncExternalStore } from "react";
import { subscribe, getSyncState, syncNow } from "./sync";

export function useSync() {
  const state = useSyncExternalStore(subscribe, getSyncState);
  return { ...state, syncNow };
}
