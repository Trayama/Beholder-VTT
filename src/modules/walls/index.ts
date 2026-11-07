import type { ExtensionModule } from "../../core/module-registry.js";
import { logger } from "../../core/logger.js";
import { WallReconciler } from "../../scene/walls/reconciler.js";
import { WallDrawTool } from "./wall-draw-tool.js";
import { MovementBlocker } from "../../scene/walls/movement-blocker.js";
import { TokenMovementTool } from "../../scene/walls/movement-tool.js";

export class WallsModule implements ExtensionModule {
  readonly id = "scene.walls";
  private readonly reconciler = new WallReconciler();
  private readonly tool = new WallDrawTool(this.reconciler);
  private readonly movementBlocker = new MovementBlocker();
  private readonly movementTool = new TokenMovementTool();

  async start(): Promise<void> {
    this.reconciler.start();
    await this.movementBlocker.start();
    await this.movementTool.start();
    await this.tool.start();
    logger.info("Wall and movement module initialized.");
  }

  async stop(): Promise<void> {
    await this.tool.stop();
    await this.movementTool.stop();
    this.movementBlocker.stop();
    this.reconciler.stop();
  }
}
