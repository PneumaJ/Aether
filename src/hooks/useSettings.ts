import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";

export function useSettings() {
  const store = useSettingsStore();

  useEffect(() => {
    if (!store.loaded) {
      store.load();
    }
  }, [store.loaded, store.load]);

  return store;
}
