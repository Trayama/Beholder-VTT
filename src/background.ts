import { OBR } from "./platform/obr.js";
import { ModuleRegistry } from "./core/module-registry.js";
import { logger } from "./core/logger.js";
import { WallsModule } from "./modules/walls/index.js";

const registry = new ModuleRegistry();
registry.register(new WallsModule());

OBR.onReady(async () => {
  try {
    const role = await OBR.player.getRole();
    logger.info("Owlbear SDK ready.", { role, version: "0.0.2" });
    await registry.startAll();
    await OBR.notification.show(
      role === "GM"
        ? "Beholder VTT 开发版已加载。可使用工具栏的墙体绘制工具。"
        : "Beholder VTT 已连接，正在同步场景墙体。",
      "SUCCESS",
    );
  } catch (error) {
    logger.error("Extension startup failed.", error);
    await OBR.notification.show(
      `Beholder VTT 启动失败：${error instanceof Error ? error.message : "未知错误"}`,
      "ERROR",
    );
  }
});
