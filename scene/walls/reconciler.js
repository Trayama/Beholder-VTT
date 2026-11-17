import { OBR } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { isLocalGuide, isLocalWall, isWallSource, readLocalGuideMetadata, readLocalWallMetadata, readWallSourceMetadata } from "./model.js";
import { applySourceToGuideDraft, applySourceToLocalDraft, createLocalGuide, createLocalWall, sourceMatchesGuide, sourceMatchesProjection } from "./source.js";
export class WallReconciler {
    queue = Promise.resolve();
    unsubscribers = [];
    disposed = false;
    expectedLocalIds = new Set();
    guidesVisible = true;
    lastSourceSignature = "";
    setGuidesVisible(visible) {
        if (this.guidesVisible === visible)
            return;
        this.guidesVisible = visible;
        void this.schedule("guide-visibility-changed");
    }
    sourceSignature(items) {
        return items.filter(isWallSource).map((item) => {
            const metadata = readWallSourceMetadata(item);
            return [
                item.id,
                metadata?.revision ?? 0,
                item.startPosition?.x ?? 0,
                item.startPosition?.y ?? 0,
                item.endPosition?.x ?? 0,
                item.endPosition?.y ?? 0,
                metadata?.blocking.blocksMovement ?? false,
                metadata?.blocking.blocksVision ?? false,
                metadata?.blocking.blocksLight ?? false,
            ].join(":");
        }).sort().join("|");
    }
    start() {
        if (this.unsubscribers.length > 0)
            return;
        this.unsubscribers.push(OBR.scene.items.onChange((items) => {
            const signature = this.sourceSignature(items);
            if (signature !== this.lastSourceSignature) {
                void this.schedule("shared-wall-change");
            }
        }), OBR.scene.local.onChange((items) => {
            const actual = new Set(items.filter((item) => isLocalWall(item) || isLocalGuide(item)).map((item) => item.id));
            const missing = [...this.expectedLocalIds].some((id) => !actual.has(id));
            const unexpected = [...actual].some((id) => !this.expectedLocalIds.has(id));
            if (missing || unexpected)
                void this.schedule("local-projection-change");
        }), OBR.player.onChange(() => {
            void this.schedule("player-role-or-profile-change");
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
                logger.warn("A scene subscription could not be removed cleanly.", error);
            }
        }
    }
    schedule(reason) {
        this.queue = this.queue.then(async () => {
            if (this.disposed || !(await OBR.scene.isReady()))
                return;
            await this.reconcile(reason);
        }).catch((error) => {
            logger.error(`Wall reconciliation failed (${reason}).`, error);
        });
        return this.queue;
    }
    async reconcile(reason) {
        const [sharedItems, localItems] = await Promise.all([
            OBR.scene.items.getItems(),
            OBR.scene.local.getItems(),
        ]);
        const sources = sharedItems.filter(isWallSource);
        this.lastSourceSignature = this.sourceSignature(sharedItems);
        const sourceById = new Map(sources.map((source) => [source.id, source]));
        const role = await OBR.player.getRole();
        const localWalls = localItems.filter(isLocalWall);
        const localGuides = localItems.filter(isLocalGuide);
        const localBySource = new Map();
        const guidesBySource = new Map();
        for (const wall of localWalls) {
            const localMetadata = readLocalWallMetadata(wall);
            if (!localMetadata)
                continue;
            const group = localBySource.get(localMetadata.sourceId) ?? [];
            group.push(wall);
            localBySource.set(localMetadata.sourceId, group);
        }
        for (const guide of localGuides) {
            const localMetadata = readLocalGuideMetadata(guide);
            if (!localMetadata)
                continue;
            const group = guidesBySource.get(localMetadata.sourceId) ?? [];
            group.push(guide);
            guidesBySource.set(localMetadata.sourceId, group);
        }
        const additions = [];
        const guideAdditions = [];
        const updates = [];
        const guideUpdates = [];
        const deletions = [];
        const nextExpectedIds = new Set();
        for (const source of sources) {
            const metadata = readWallSourceMetadata(source);
            const candidates = localBySource.get(source.id) ?? [];
            // A native WALL is used only as a vision-shadow projection. Its native
            // blocking flag couples token and light collision, so it must stay false;
            // movement is handled by MovementBlocker from the independent source data.
            if (metadata?.blocking.blocksVision) {
                const existing = candidates.shift();
                if (!existing) {
                    additions.push(createLocalWall(source));
                }
                else {
                    nextExpectedIds.add(existing.id);
                    if (!sourceMatchesProjection(source, existing)) {
                        updates.push({ current: existing, source });
                    }
                }
            }
            for (const unused of candidates)
                deletions.push(unused.id);
            const guideCandidates = guidesBySource.get(source.id) ?? [];
            const existingGuide = guideCandidates.shift();
            if (role === "GM") {
                if (!existingGuide) {
                    guideAdditions.push(createLocalGuide(source, this.guidesVisible));
                }
                else {
                    nextExpectedIds.add(existingGuide.id);
                    if (!sourceMatchesGuide(source, existingGuide, this.guidesVisible)) {
                        guideUpdates.push({ current: existingGuide, source });
                    }
                }
            }
            else if (existingGuide) {
                deletions.push(existingGuide.id);
            }
            for (const duplicate of guideCandidates)
                deletions.push(duplicate.id);
        }
        for (const wall of localWalls) {
            const localMetadata = readLocalWallMetadata(wall);
            if (!localMetadata || !sourceById.has(localMetadata.sourceId)) {
                deletions.push(wall.id);
            }
        }
        for (const guide of localGuides) {
            const localMetadata = readLocalGuideMetadata(guide);
            if (role !== "GM" || !localMetadata || !sourceById.has(localMetadata.sourceId)) {
                deletions.push(guide.id);
            }
        }
        for (const wall of additions)
            nextExpectedIds.add(wall.id);
        for (const guide of guideAdditions)
            nextExpectedIds.add(guide.id);
        this.expectedLocalIds = nextExpectedIds;
        if (deletions.length > 0) {
            await OBR.scene.local.deleteItems([...new Set(deletions)]);
        }
        if (updates.length > 0) {
            const sourceByLocalId = new Map(updates.map((entry) => [entry.current.id, entry.source]));
            await OBR.scene.local.updateItems(updates.map((entry) => entry.current), (drafts) => {
                for (const draft of drafts) {
                    const source = sourceByLocalId.get(draft.id);
                    if (source)
                        applySourceToLocalDraft(draft, source);
                }
            });
        }
        if (guideUpdates.length > 0) {
            const sourceByGuideId = new Map(guideUpdates.map((entry) => [entry.current.id, entry.source]));
            await OBR.scene.local.updateItems(guideUpdates.map((entry) => entry.current), (drafts) => {
                for (const draft of drafts) {
                    const source = sourceByGuideId.get(draft.id);
                    if (source)
                        applySourceToGuideDraft(draft, source, this.guidesVisible);
                }
            });
        }
        if (additions.length > 0) {
            await OBR.scene.local.addItems(additions);
        }
        if (guideAdditions.length > 0) {
            await OBR.scene.local.addItems(guideAdditions);
        }
        logger.debug("Wall projections reconciled.", {
            reason,
            sharedSources: sources.length,
            localBefore: localWalls.length,
            added: additions.length + guideAdditions.length,
            updated: updates.length + guideUpdates.length,
            deleted: deletions.length,
            gmGuides: role === "GM",
        });
    }
}
//# sourceMappingURL=reconciler.js.map