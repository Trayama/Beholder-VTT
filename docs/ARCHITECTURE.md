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

## UI placement architecture

- The primary Beholder entry is an Owlbear custom Tool created with `OBR.tool.create`; it belongs in the right-side scene toolbar.
- Tool Modes are shown in the left side of the selected tool's top menu; Tool Actions are shown on the right side of that menu.
- A single available mode may be hidden by Owlbear to keep the menu compact. This does not hide the parent Tool from the right-side toolbar.
- Do not make the primary workflow accessible only through an extension Action in the upper-left corner.
- Use one Beholder toolbar entry with contextual modes and actions. Use a Popover only for configuration or information that does not belong directly in the canvas interaction flow.
- Player-facing visibility and GM-only permissions must be controlled independently: the tool may be visible to both roles while destructive or authoring modes remain GM-only, if that produces a clearer interface.

## Current implementation boundary

Version 0.0.2 implements single-segment creation, shared hidden `LINE` storage, local `WALL` projection, `attachedTo`, GM-only local helper lines, and reconciliation. It stores all three blocking flags independently. For this initial vertical slice, only `blocksVision` is mapped to Owlbear's native `WALL.blocking`; movement collision and a separate light-blocking adapter are not yet implemented.

Owlbear documents native `WALL` items as local-only and as part of its Dynamic Fog feature. Beholder's own source geometry and lifecycle remain independent of Fog/Light state; the native `WALL` is currently only the client-side projection used by this slice. Do not silently expand this projection into the wall data model.
