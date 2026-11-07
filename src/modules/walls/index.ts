import type { ExtensionModule } from "../../core/module-registry.js";
import { logger } from "../../core/logger.js";
import { WallReconciler } from "../../scene/walls/reconciler.js";
import { WallDrawTool } from "./wall-draw-tool.js";

export class WallsModule implements ExtensionModule {
  readonly id = "scene.walls";
  private readonly reconciler = new WallReconciler();
  private readonly tool = new WallDrawTool(this.reconciler);

  async start(): Promise<void> {
    this.reconciler.start();
    await this.tool.start();
    logger.info("Wall module initialized.");
  }

  async stop(): Promise<void> {
    await this.tool.stop();
    this.reconciler.stop();
  }
}
