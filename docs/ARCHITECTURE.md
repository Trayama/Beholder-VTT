# Wall data and projection architecture

This is a hard architectural constraint for the wall system. Do not replace it with a Fog- or Light-owned wall model.

## Source of truth

1. The GM creates shared, hidden Owlbear `LINE` source items.
2. Each source stores a segment of wall geometry and versioned metadata in its metadata namespace.
3. Consecutive segments share a `wallId` and carry `segmentIndex` / `segmentCount`.
4. Every client reads the shared source items.
5. Every client creates its own local Owlbear `WALL` projection for each source that blocks vision.
6. Each local `WALL` stores the source ID and revision, and uses `attachedTo` to associate with the shared source.
7. The GM additionally receives local helper `LINE` items; they are never shared with players.
8. A reconciler compares shared source definitions with local projections and creates, updates, removes, or deduplicates local objects as required.

## Invariants

- Shared `LINE` objects are authoritative. Local `WALL` objects are disposable projections and can always be rebuilt.
- Fog fill, fog cutouts, light definitions, and light settings are not the source of truth for wall geometry.
- The wall data model owns geometry and independent blocking flags: movement, vision, and light.
- Fog and lighting may consume spatial information through adapters, but they do not own the wall editor or wall data lifecycle.
- Local-only objects must be reconciled independently on every client, including after scene reload and reconnect.
- GM helper lines remain local and must not leak into player clients.
- Local UI preferences such as toolbar visibility, grid snapping, and guide visibility must not be written into shared scene metadata.

## Independent blocking architecture

- `blocksMovement`, `blocksVision`, and `blocksLight` are independent shared source properties.
- Native Owlbear `WALL.blocking` affects both token and light collision. Beholder therefore keeps the native blocking flag off for its local WALL projections.
- Vision blocking is represented by the presence or absence of the local WALL projection.
- Movement blocking is calculated by Beholder's own GM-authoritative adapter from shared LINE geometry. It does not read Fog or Light state.
- Light blocking remains a separate property and will be implemented by a later light adapter.

## Movement correction boundary

- The GM client is the single correction authority to avoid every client racing to rewrite the same token position.
- It observes committed scene item changes for CHARACTER and MOUNT image tokens.
- When a token's swept movement segment crosses a blocking wall, the GM calculates the last safe center using the token's bounding-circle approximation and updates the token back to that position.
- This is post-commit correction. A brief snap-back may be visible. It is not a pre-move lock and does not replace the later path-preview / pathfinding stage.
- The GM must remain connected for correction to run. Live GM/player testing is required before the feature is accepted.

## UI placement architecture

- The left-top Beholder extension action is a permanent global control entry. It provides toolbar visibility, drawing preferences, wall operations, and module status.
- The right-side custom Tool is the primary map-editing entry.
- The global control panel can hide or restore the right-side Tool for the current client without disabling wall synchronization or deleting wall data.
- Modes are ordered: Select/Edit, Line, Polyline, Rectangle, Erase.
- The properties action remains available whenever the Beholder wall tool is active.
- Player-facing visibility and GM-only permissions are controlled independently.
- Normal drawing and editing operations do not produce notifications; status feedback belongs in the control panel. Notifications are reserved for exceptional failures.

## Current implementation boundary

Version 0.0.6 includes the unified control panel, free/grid drawing preference, temporary Ctrl/Cmd grid bypass, endpoint snapping, wall selection and editing, property editing, undo/redo, clear, and a GM-authoritative post-commit movement correction adapter.

The local WALL projection keeps native `blocking=false`. The GM movement adapter uses only shared LINE source geometry and the `blocksMovement` flag. The light-blocking property is stored independently but is not yet connected to a light adapter.

## Performance boundary

- Shared scene changes are compared using a wall-source signature before scheduling reconciliation.
- Local projection IDs are tracked so unrelated local items do not trigger wall rebuilds.
- Reconciliation remains responsible for repairing missing or duplicated local projections after reconnect and scene reload.
- Movement correction is serialized and keeps a single pending full-scene snapshot to avoid overlapping corrections.
