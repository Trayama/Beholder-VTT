import { logger } from "./logger.js";

export interface ExtensionModule {
  readonly id: string;
  start(): void | Promise<void>;
  stop?(): void | Promise<void>;
}

export class ModuleRegistry {
  private readonly modules = new Map<string, ExtensionModule>();
  private readonly started: ExtensionModule[] = [];

  register(module: ExtensionModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Duplicate module registration: ${module.id}`);
    }
    this.modules.set(module.id, module);
    logger.debug(`Module registered: ${module.id}`);
  }

  async startAll(): Promise<void> {
    for (const module of this.modules.values()) {
      if (this.started.includes(module)) continue;
      await module.start();
      this.started.push(module);
      logger.info(`Module started: ${module.id}`);
    }
  }

  async stopAll(): Promise<void> {
    for (const module of [...this.started].reverse()) {
      try {
        await module.stop?.();
        logger.info(`Module stopped: ${module.id}`);
      } catch (error) {
        logger.error(`Module shutdown failed: ${module.id}`, error);
      }
    }
    this.started.length = 0;
  }
}
