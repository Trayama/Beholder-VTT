export const PREFERENCES = {
  toolbar: "beholder-vtt:toolbar-visible",
  guides: "beholder-vtt:guides-visible",
  snap: "beholder-vtt:grid-snap",
} as const;

export function readBooleanPreference(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

export function writeBooleanPreference(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The tool continues with its in-memory preference when storage is unavailable.
  }
}
