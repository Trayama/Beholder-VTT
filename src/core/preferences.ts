export const PREFERENCES = {
  toolbar: "beholder-vtt:toolbar-visible",
  guides: "beholder-vtt:guides-visible",
  snap: "beholder-vtt:grid-snap",
  endpointSnap: "beholder-vtt:endpoint-snap",
  selectToolId: "beholder-vtt:native-select-tool-id",
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

export function readStringPreference(key: string, fallback = ""): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStringPreference(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // The tool continues with its in-memory preference when storage is unavailable.
  }
}
