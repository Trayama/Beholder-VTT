# Wall data and projection architecture

This is a hard architectural constraint for the wall system. Do not replace it with a Fog- or Light-owned wall model.

## Source of truth

1. The GM creates a shared, hidden Owlbear `LINE` item.
2. The `LINE` stores wall geometry and versioned wall metadata in its metadata namespace.
3. Every client reads the shared source items.
4. Every client creates its own local Owlbear `WALL` projection for each source.
5. Each local `WALL` stores the source ID and revision, and uses `attachedTo` to associate it with the shared source.
6. The GM additionally receives a local helper `LINE`; it is never shared with players.
7. A reconciler compares shared source definitions with local projections and creates, updates, removes, or deduplicates local objects as required.

## Invariants

- Shared `LINE` objects are authoritative. Local `WALL` objects are disposable projections and can always be rebuilt.
- Fog fill, fog cutouts, light definitions, and light settings are not the source of truth for wall geometry.
- The wall data model owns geometry and independent blocking flags: movement, vision, and light.
- Fog and lighting may consume spatial information through adapters, but they do not own the wall editor or wall data lifecycle.
- Local-only objects must be reconciled independently on every client, including after scene reload and reconnect.
- GM helper lines remain local and must not leak into player clients.

## Current implementation boundary

Version 0.0.1 implements single-segment creation, shared hidden `LINE` storage, local `WALL` projection, `attachedTo`, GM-only local helper lines, and reconciliation. It stores all three blocking flags independently. For this initial vertical slice, only `blocksVision` is mapped to Owlbear's native `WALL.blocking`; movement collision and a separate light-blocking adapter are not yet implemented.

Owlbear documents native `WALL` items as local-only and as part of its Dynamic Fog feature. Beholder's own source geometry and lifecycle remain independent of Fog/Light state; the native `WALL` is currently only the client-side projection used by this slice. Do not silently expand this projection into the wall data model.
