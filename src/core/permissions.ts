import { OBR } from "../platform/obr.js";
import type { PlayerRole } from "../platform/obr.js";

export async function getCurrentRole(): Promise<PlayerRole> {
  return OBR.player.getRole();
}

export async function isGM(): Promise<boolean> {
  return (await getCurrentRole()) === "GM";
}

export async function requireGM(): Promise<boolean> {
  return isGM();
}
