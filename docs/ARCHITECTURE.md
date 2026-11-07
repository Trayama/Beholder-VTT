# Wall data and projection architecture

This is a hard architectural constraint for the wall system. Do not replace it with a Fog- or Light-owned wall model.

## Source of truth

1. The GM creates shared, hidden Owlbear `LINE` source items.
2. Each source stores a segment of wall geometry and versioned metadata in its metadata namespace.
3. Consecutive segments share a `wallId` and carry `segmentIndex` / `segmentCount`.
4. Every client reads the shared source items.
5. Every client creates its own local Owlbear `WALL` projection for each source.
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

## UI placement architecture

- The left-top Beholder extension action is a permanent global control entry. It hosts configuration and module status only.
- The right-side custom Tool is the primary map-editing entry.
- The global control panel can hide or restore the right-side Tool for the current client without disabling wall synchronization or deleting wall data.
- Tool Modes appear on the left side of the selected tool's top menu; Tool Actions appear on the right side.
- Use one Beholder toolbar entry with contextual modes and actions. Use a Popover for configuration or information that does not belong directly in the canvas interaction flow.
- Player-facing visibility and GM-only permissions are controlled independently.

## Current implementation boundary

Version 0.0.4 implements line, polyline, and rectangle wall creation; grouped source segments; group selection and movement; connected endpoint editing; whole-group erasing; wall property editing; grid snapping; local GM guide visibility; undo/redo; and confirmed clear.

The wall data model stores all three blocking flags. Only `blocksVision` is currently mapped to Owlbear's native `WALL.blocking`; movement collision and a separate light-blocking adapter are not yet implemented. The property panel explicitly describes this boundary.

Owlbear documents native `WALL` items as local-only and as part of its Dynamic Fog feature. Beholder's own source geometry and lifecycle remain independent of Fog/Light state; the native `WALL` is currently only the client-side projection used by this slice.

## Performance boundary

- Shared scene changes are compared using a wall-source signature before scheduling reconciliation.
- Local projection IDs are tracked so unrelated local items do not trigger wall rebuilds.
- Reconciliation remains responsible for repairing missing or duplicated local projections after reconnect and scene reload.
