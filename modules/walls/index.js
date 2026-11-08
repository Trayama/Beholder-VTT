import { logger } from "../../core/logger.js";
import { WallReconciler } from "../../scene/walls/reconciler.js";
import { WallDrawTool } from "./wall-draw-tool.js";
import { MovementBlocker } from "../../scene/walls/movement-blocker.js";
import { NativeMoveIntegration } from "../../scene/walls/movement-tool.js";
export class WallsModule {
    id = "scene.walls";
    reconciler = new WallReconciler();
    tool = new WallDrawTool(this.reconciler);
    movementBlocker = new MovementBlocker();
    nativeMove = new NativeMoveIntegration();
    async start() {
        this.reconciler.start();
        await this.movementBlocker.start();
        await this.nativeMove.start();
        await this.tool.start();
        logger.info("Wall and movement module initialized.");
    }
    async stop() {
        await this.tool.stop();
        await this.nativeMove.stop();
        this.movementBlocker.stop();
        this.reconciler.stop();
    }
}
//# sourceMappingURL=index.js.map