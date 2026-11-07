import type { ExtensionModule } from "../../core/module-registry.js";
import { logger } from "../../core/logger.js";
import { WallReconciler } from "../../scene/walls/reconciler.js";
import { WallDrawTool } from "./wall-draw-tool.js";
import { MovementBlocker } from "../../scene/walls/movement-blocker.js";

export class WallsModule implements ExtensionModule {
  readonly id = "scene.walls";
  private readonly reconciler = new WallReconciler();
  private readonly tool = new WallDrawTool(this.reconciler);
  private readonly movementBlocker = new MovementBlocker();

  async start(): Promise<void> {
    this.reconciler.start();
    await this.movementBlocker.start();
    await this.tool.start();
    logger.info("Wall module initialized.");
  }

  async stop(): Promise<void> {
    await this.tool.stop();
    this.movementBlocker.stop();
    this.reconciler.stop();
  }
}
