import { OBR } from "../../platform/obr.js";
import type { ExtensionModule } from "../../core/module-registry.js";
import { logger } from "../../core/logger.js";
import { LightReconciler } from "../../scene/lighting/reconciler.js";
import { createLightSource } from "../../scene/lighting/source.js";

const TOOL_ID = "com.beholder-vtt/lighting";
const PLACE_MODE_ID = TOOL_ID + "/place";
const SETTINGS_ACTION_ID = TOOL_ID + "/settings";
const PROPERTIES_POPOVER_ID = "com.beholder-vtt/light-properties";

export class LightingModule implements ExtensionModule {
  readonly id = "scene.lighting";
  private readonly reconciler = new LightReconciler();
  private registered = false;
  private readonly icon = new URL("./icons/light.svg", window.location.href).toString();

  async start(): Promise<void> {
    this.reconciler.start();
    const filter = { activeTools: [TOOL_ID], roles: ["GM" as const] };
    await OBR.tool.create({
      id: TOOL_ID,
      icons: [{ icon: this.icon, label: "Beholder 光源", filter: { roles: ["GM"] } }],
      defaultMode: PLACE_MODE_ID,
    });
    await OBR.tool.createMode({
      id: PLACE_MODE_ID,
      icons: [{ icon: this.icon, label: "点击地图放置光源", filter }],
      disabled: { roles: ["PLAYER"] },
      cursors: [{ cursor: "crosshair" }],
      onToolClick: async (_context, event) => {
        if ((await OBR.player.getRole()) !== "GM") return false;
        const source = createLightSource(event.pointerPosition);
        await OBR.scene.items.addItems([source]);
        await OBR.tool.setMetadata(TOOL_ID, { selectedLightSourceId: source.id });
        return false;
      },
    });
    await OBR.tool.createAction({
      id: SETTINGS_ACTION_ID,
      icons: [{ icon: this.icon, label: "光源设置", filter }],
      onClick: async (_context, elementId) => {
        await OBR.popover.open({
          id: PROPERTIES_POPOVER_ID,
          url: new URL("./light-properties.html", window.location.href).toString(),
          width: 320,
          height: 540,
          anchorElementId: elementId,
        });
      },
    });
    this.registered = true;
    logger.info("Shared light definitions and local projections initialized.");
  }

  async stop(): Promise<void> {
    this.reconciler.stop();
    if (this.registered) {
      try { await OBR.tool.removeAction(SETTINGS_ACTION_ID); } catch { /* already removed */ }
      try { await OBR.tool.removeMode(PLACE_MODE_ID); } catch { /* already removed */ }
      try { await OBR.tool.remove(TOOL_ID); } catch { /* already removed */ }
    }
    this.registered = false;
  }
}
