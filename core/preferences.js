export const PREFERENCES = {
    toolbar: "beholder-vtt:toolbar-visible",
    guides: "beholder-vtt:guides-visible",
    snap: "beholder-vtt:grid-snap",
    endpointSnap: "beholder-vtt:endpoint-snap",
    groupMovement: "beholder-vtt:group-movement",
    movementTakeover: "beholder-vtt:movement-takeover",
};
export function readBooleanPreference(key, fallback) {
    try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value === "true";
    }
    catch {
        return fallback;
    }
}
export function writeBooleanPreference(key, value) {
    try {
        window.localStorage.setItem(key, String(value));
    }
    catch {
        // The tool continues with its in-memory preference when storage is unavailable.
    }
}
export function readStringPreference(key, fallback = "") {
    try {
        return window.localStorage.getItem(key) ?? fallback;
    }
    catch {
        return fallback;
    }
}
export function writeStringPreference(key, value) {
    try {
        if (value)
            window.localStorage.setItem(key, value);
        else
            window.localStorage.removeItem(key);
    }
    catch {
        // The tool continues with its in-memory preference when storage is unavailable.
    }
}
//# sourceMappingURL=preferences.js.map