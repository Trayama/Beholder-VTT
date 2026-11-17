import { OBR } from "../platform/obr.js";
export async function getCurrentRole() {
    return OBR.player.getRole();
}
export async function isGM() {
    return (await getCurrentRole()) === "GM";
}
export async function requireGM() {
    return isGM();
}
//# sourceMappingURL=permissions.js.map