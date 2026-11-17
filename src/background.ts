import { OBR } from "./platform/obr.js";
import { ModuleRegistry } from "./core/module-registry.js";
import { logger } from "./core/logger.js";
import { WallsModule } from "./modules/walls/index.js";
import { LightingModule } from "./modules/lighting/index.js";

const registry = new ModuleRegistry();
registry.register(new WallsModule());
registry.register(new LightingModule());

OBR.onReady(async () => {
  try {
    const role = await OBR.player.getRole();
    logger.info("Owlbear SDK ready.", { role, version: "0.0.17" });
    await registry.startAll();
  } catch (error) {
    logger.error("Extension startup failed.", error);
    await OBR.notification.show(
      `Beholder VTT ����ʧ�ܣ�${error instanceof Error ? error.message : "δ֪����"}`,
      "ERROR",
    );
  }
});
