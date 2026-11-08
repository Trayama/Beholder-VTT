import { logger } from "./logger.js";
export class ModuleRegistry {
    modules = new Map();
    started = [];
    register(module) {
        if (this.modules.has(module.id)) {
            throw new Error(`Duplicate module registration: ${module.id}`);
        }
        this.modules.set(module.id, module);
        logger.debug(`Module registered: ${module.id}`);
    }
    async startAll() {
        for (const module of this.modules.values()) {
            if (this.started.includes(module))
                continue;
            await module.start();
            this.started.push(module);
            logger.info(`Module started: ${module.id}`);
        }
    }
    async stopAll() {
        for (const module of [...this.started].reverse()) {
            try {
                await module.stop?.();
                logger.info(`Module stopped: ${module.id}`);
            }
            catch (error) {
                logger.error(`Module shutdown failed: ${module.id}`, error);
            }
        }
        this.started.length = 0;
    }
}
//# sourceMappingURL=module-registry.js.map