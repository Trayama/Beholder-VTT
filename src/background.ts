import { OBR } from "./platform/obr.js";
import { ModuleRegistry } from "./core/module-registry.js";
import { logger } from "./core/logger.js";
import { WallsModule } from "./modules/walls/index.js";

const registry = new ModuleRegistry();
registry.register(new WallsModule());

OBR.onReady(async () => {
  try {
    const role = await OBR.player.getRole();
    logger.info("Owlbear SDK ready.", { role, version: "0.0.7" });
    await registry.startAll();
  } catch (error) {
    logger.error("Extension startup failed.", error);
    await OBR.notification.show(
      `Beholder VTT 启动失败：${error instanceof Error ? error.message : "未知错误"}`,
      "ERROR",
    );
  }
});
