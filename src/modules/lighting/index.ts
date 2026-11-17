import { OBR } from "../../platform/obr.js";
import type { ExtensionModule } from "../../core/module-registry.js";
import { logger } from "../../core/logger.js";
import { LightReconciler } from "../../scene/lighting/reconciler.js";
import { createLightSource } from "../../scene/lighting/source.js";

const TOOL_ID = "com.beholder-vtt/lighting";
const PLACE_MODE_ID = TOOL_ID + "/place";

export class LightingModule implements ExtensionModule {
  readonly id = "scene.lighting";
  private readonly reconciler = new LightReconciler();
  private registered = false;

  async start(): Promise<void> {
    this.reconciler.start();
    const filter = { activeTools: [TOOL_ID], roles: ["GM" as const] };
    await OBR.tool.create({
      id: TOOL_ID,
      icons: [{ icon: new URL("./icons/light.svg", window.location.href).toString(), label: "Beholder Light", filter: { roles: ["GM"] } }],
      defaultMode: PLACE_MODE_ID,
    });
    await OBR.tool.createMode({
      id: PLACE_MODE_ID,
      icons: [{ icon: new URL("./icons/light.svg", window.location.href).toString(), label: "Place light", filter }],
      disabled: { roles: ["PLAYER"] },
      cursors: [{ cursor: "crosshair" }],
      onToolClick: async (_context, event) => {
        if ((await OBR.player.getRole()) !== "GM") return false;
        await OBR.scene.items.addItems([createLightSource(event.pointerPosition)]);
        return false;
      },
    });
    this.registered = true;
    logger.info("Shared light definitions and local projections initialized.");
  }

  async stop(): Promise<void> {
    this.reconciler.stop();
    if (this.registered) {
      try { await OBR.tool.removeMode(PLACE_MODE_ID); } catch { /* already removed */ }
      try { await OBR.tool.remove(TOOL_ID); } catch { /* already removed */ }
    }
    this.registered = false;
  }
}
