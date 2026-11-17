import { OBR } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { isLightSource, isLocalLight, readLocalLightMetadata } from "./model.js";
import { applySourceToLight, createLocalLight, localLightMatches } from "./source.js";
export class LightReconciler {
    queue = Promise.resolve();
    unsubscribers = [];
    expectedLocalIds = new Set();
    lastSignature = "";
    disposed = false;
    start() {
        if (this.unsubscribers.length)
            return;
        this.unsubscribers.push(OBR.scene.items.onChange((items) => {
            const signature = this.signature(items);
            if (signature !== this.lastSignature)
                void this.schedule("shared-light-change");
        }), OBR.scene.local.onChange((items) => {
            const localIds = new Set(items.filter(isLocalLight).map((item) => item.id));
            if ([...this.expectedLocalIds].some((id) => !localIds.has(id)) || [...localIds].some((id) => !this.expectedLocalIds.has(id))) {
                void this.schedule("local-light-change");
            }
        }), OBR.scene.onReadyChange((ready) => {
            if (ready)
                void this.schedule("scene-ready");
            else
                this.expectedLocalIds.clear();
        }));
        void this.schedule("startup");
    }
    stop() {
        this.disposed = true;
        for (const unsubscribe of this.unsubscribers.splice(0)) {
            try {
                unsubscribe();
            }
            catch (error) {
                logger.warn("Light subscription cleanup failed.", error);
            }
        }
    }
    signature(items) {
        return items.filter(isLightSource).map((source) => {
            const m = source.metadata["com.beholder-vtt/light-source"];
            return [source.id, m.revision, source.attachedTo, source.position?.x, source.position?.y, source.rotation, source.scale?.x, source.scale?.y].join(":");
        }).sort().join("|");
    }
    schedule(reason) {
        this.queue = this.queue.then(async () => {
            if (this.disposed || !(await OBR.scene.isReady()))
                return;
            await this.reconcile(reason);
        }).catch((error) => logger.error(`Light reconciliation failed (${reason}).`, error));
        return this.queue;
    }
    async reconcile(reason) {
        const [shared, local] = await Promise.all([OBR.scene.items.getItems(), OBR.scene.local.getItems()]);
        const sources = shared.filter(isLightSource);
        this.lastSignature = this.signature(shared);
        const sourceById = new Map(sources.map((source) => [source.id, source]));
        const candidates = new Map();
        for (const item of local.filter(isLocalLight)) {
            const sourceId = readLocalLightMetadata(item)?.sourceId;
            if (!sourceId)
                continue;
            const group = candidates.get(sourceId) ?? [];
            group.push(item);
            candidates.set(sourceId, group);
        }
        const add = [];
        const update = [];
        const remove = [];
        const expected = new Set();
        for (const source of sources) {
            const group = candidates.get(source.id) ?? [];
            const current = group.shift();
            if (!current) {
                const projection = createLocalLight(source);
                if (projection)
                    add.push(projection);
            }
            else {
                expected.add(current.id);
                if (!localLightMatches(source, current))
                    update.push({ current, source });
            }
            remove.push(...group.map((item) => item.id));
        }
        for (const light of local.filter(isLocalLight)) {
            const sourceId = readLocalLightMetadata(light)?.sourceId;
            if (!sourceId || !sourceById.has(sourceId))
                remove.push(light.id);
        }
        for (const light of add)
            expected.add(light.id);
        this.expectedLocalIds = expected;
        if (remove.length)
            await OBR.scene.local.deleteItems([...new Set(remove)]);
        if (update.length) {
            const byLightId = new Map(update.map((entry) => [entry.current.id, entry.source]));
            await OBR.scene.local.updateItems(update.map((entry) => entry.current), (drafts) => {
                for (const draft of drafts) {
                    const source = byLightId.get(draft.id);
                    if (source)
                        applySourceToLight(source, draft);
                }
            });
        }
        if (add.length)
            await OBR.scene.local.addItems(add);
        logger.debug("Light projections reconciled.", { reason, sources: sources.length, added: add.length, updated: update.length, deleted: remove.length });
    }
}
//# sourceMappingURL=reconciler.js.map