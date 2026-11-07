import { OBR } from "../../platform/obr.js";
import type { LineItem, SceneItem, WallItem } from "../../platform/obr.js";
import { logger } from "../../core/logger.js";
import { isLocalGuide, isLocalWall, isWallSource, readLocalGuideMetadata, readLocalWallMetadata } from "./model.js";
import { applySourceToGuideDraft, applySourceToLocalDraft, createLocalGuide, createLocalWall, sourceMatchesGuide, sourceMatchesProjection } from "./source.js";

interface ProjectionUpdate {
  current: WallItem;
  source: LineItem;
}

export class WallReconciler {
  private queue: Promise<void> = Promise.resolve();
  private readonly unsubscribers: Array<() => void> = [];
  private disposed = false;
  private expectedLocalIds = new Set<string>();

  start(): void {
    if (this.unsubscribers.length > 0) return;

    this.unsubscribers.push(
      OBR.scene.items.onChange(() => {
        void this.schedule("shared-scene-change");
      }),
      OBR.scene.local.onChange((items) => {
        const actual = new Set(items.filter((item) => isLocalWall(item) || isLocalGuide(item)).map((item) => item.id));
        const missing = [...this.expectedLocalIds].some((id) => !actual.has(id));
        const unexpected = [...actual].some((id) => !this.expectedLocalIds.has(id));
        if (missing || unexpected) void this.schedule("local-projection-change");
      }),
      OBR.player.onChange(() => {
        void this.schedule("player-role-or-profile-change");
      }),
      OBR.scene.onReadyChange((ready) => {
        if (ready) void this.schedule("scene-ready");
        else this.expectedLocalIds.clear();
      }),
    );

    void this.schedule("startup");
  }

  stop(): void {
    this.disposed = true;
    for (const unsubscribe of this.unsubscribers.splice(0)) {
      try {
        unsubscribe();
      } catch (error) {
        logger.warn("A scene subscription could not be removed cleanly.", error);
      }
    }
  }

  schedule(reason: string): Promise<void> {
    this.queue = this.queue.then(async () => {
      if (this.disposed || !(await OBR.scene.isReady())) return;
      await this.reconcile(reason);
    }).catch((error: unknown) => {
      logger.error(`Wall reconciliation failed (${reason}).`, error);
    });
    return this.queue;
  }

  private async reconcile(reason: string): Promise<void> {
    const [sharedItems, localItems] = await Promise.all([
      OBR.scene.items.getItems(),
      OBR.scene.local.getItems(),
    ]);

    const sources = sharedItems.filter(isWallSource) as LineItem[];
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    const role = await OBR.player.getRole();
    const localWalls = localItems.filter(isLocalWall) as WallItem[];
    const localGuides = localItems.filter(isLocalGuide) as LineItem[];
    const localBySource = new Map<string, WallItem[]>();
    const guidesBySource = new Map<string, LineItem[]>();

    for (const wall of localWalls) {
      const localMetadata = readLocalWallMetadata(wall);
      if (!localMetadata) continue;
      const group = localBySource.get(localMetadata.sourceId) ?? [];
      group.push(wall);
      localBySource.set(localMetadata.sourceId, group);
    }
    for (const guide of localGuides) {
      const localMetadata = readLocalGuideMetadata(guide);
      if (!localMetadata) continue;
      const group = guidesBySource.get(localMetadata.sourceId) ?? [];
      group.push(guide);
      guidesBySource.set(localMetadata.sourceId, group);
    }

    const additions: WallItem[] = [];
    const guideAdditions: LineItem[] = [];
    const updates: ProjectionUpdate[] = [];
    const guideUpdates: Array<{ current: LineItem; source: LineItem }> = [];
    const deletions: string[] = [];
    const nextExpectedIds = new Set<string>();

    for (const source of sources) {
      const candidates = localBySource.get(source.id) ?? [];
      const existing = candidates.shift();

      if (!existing) {
        additions.push(createLocalWall(source));
      } else {
        nextExpectedIds.add(existing.id);
        if (!sourceMatchesProjection(source, existing)) {
          updates.push({ current: existing, source });
        }
      }
      for (const duplicate of candidates) deletions.push(duplicate.id);

      const guideCandidates = guidesBySource.get(source.id) ?? [];
      const existingGuide = guideCandidates.shift();
      if (role === "GM") {
        if (!existingGuide) {
          guideAdditions.push(createLocalGuide(source));
        } else {
          nextExpectedIds.add(existingGuide.id);
          if (!sourceMatchesGuide(source, existingGuide)) {
            guideUpdates.push({ current: existingGuide, source });
          }
        }
      } else if (existingGuide) {
        deletions.push(existingGuide.id);
      }
      for (const duplicate of guideCandidates) deletions.push(duplicate.id);
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

    if (deletions.length > 0) {
      await OBR.scene.local.deleteItems([...new Set(deletions)]);
    }

    if (updates.length > 0) {
      const sourceByLocalId = new Map(updates.map((entry) => [entry.current.id, entry.source]));
      await OBR.scene.local.updateItems(
        updates.map((entry) => entry.current),
        (drafts) => {
          for (const draft of drafts) {
            const source = sourceByLocalId.get(draft.id);
            if (source) applySourceToLocalDraft(draft, source);
          }
        },
      );
    }

    if (guideUpdates.length > 0) {
      const sourceByGuideId = new Map(guideUpdates.map((entry) => [entry.current.id, entry.source]));
      await OBR.scene.local.updateItems(
        guideUpdates.map((entry) => entry.current),
        (drafts) => {
          for (const draft of drafts) {
            const source = sourceByGuideId.get(draft.id);
            if (source) applySourceToGuideDraft(draft, source);
          }
        },
      );
    }

    if (additions.length > 0) {
      await OBR.scene.local.addItems(additions);
      for (const wall of additions) nextExpectedIds.add(wall.id);
    }
    if (guideAdditions.length > 0) {
      await OBR.scene.local.addItems(guideAdditions);
      for (const guide of guideAdditions) nextExpectedIds.add(guide.id);
    }

    this.expectedLocalIds = nextExpectedIds;
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
