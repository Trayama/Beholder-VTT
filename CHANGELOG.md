# Changelog

## 0.0.6 — Control panel and movement correction

- Replace the tabbed control panel with a single functional dashboard.
- Put toolbar visibility, free/grid drawing, endpoint snap, GM guides, wall properties, undo/redo and clear actions in one place.
- Reorder wall modes to Select, Line, Polyline, Rectangle, Erase.
- Keep the wall properties action visible whenever the Beholder wall tool is active.
- Allow Ctrl / Cmd to temporarily bypass grid snapping while drawing or editing.
- Make the GM client the single movement-collision correction authority.
- Watch CHARACTER and MOUNT image tokens and correct movement across blocking wall segments.
- Remove player-id gating that could silently skip valid token movement changes.
- Keep native WALL blocking disabled so movement collision remains independent from light collision.
- Clarify that movement correction is post-commit and may briefly snap tokens back.
- Add an in-panel note about disabling the legacy WallBrush extension to avoid duplicate tools and notifications.

Automated validation and live Owlbear room verification are tracked separately. The real GM/player room acceptance remains pending.

## 0.0.5 — Initial movement guard and control panel

- Add the first movement collision observer and local control panel.
- Add free/grid snap preference and endpoint snap setting.
- Add GM / player role-specific panel controls.

## 0.0.4 — Restore the wall editor workflow

- Add a permanent top-left Beholder VTT control popover.
- Add a local preference to show or hide the right-side wall editor tool.
- Add local controls for GM guide visibility and grid snapping.
- Restore the wall editor modes: line, polyline, rectangle, select/edit, and erase.
- Add wall selection, whole-group movement, connected-node editing, and whole-wall erasing.
- Add a wall properties popover for independent movement, vision, and light blocking metadata.
- Restore undo, redo, and confirmed clear actions.
- Group multi-segment walls by a shared wall ID and segment indices.
- Reduce unnecessary wall reconciliation by ignoring unrelated scene-item changes.

## 0.0.3 — Restore GitHub Pages hosting

- Serve the extension Manifest, background HTML, JavaScript, and icon from one GitHub Pages origin.
- Keep jsDelivr only for third-party SDK dependencies, not the extension entry page.
- Switch the deployment workflow from publishing to the official GitHub Pages artifact deployment flow.

## 0.0.2 — Toolbar registration fix

- Make wall tool registration idempotent across background iframe reloads.
- Follow Owlbear's documented custom-tool creation sequence and omit premature defaultMode registration.

## 0.0.1 — Initial development slice

- Create the independent TypeScript Owlbear extension project.
- Add the module registry, logger, and GM permission helper.
- Add versioned shared wall metadata with independent movement, vision, and light flags.
- Add hidden shared LINE sources and per-client local WALL projection.
- Add the GM-only local guide line and geometry / metadata unit tests.
