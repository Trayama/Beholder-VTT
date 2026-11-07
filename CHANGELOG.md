# Changelog

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

Automated typecheck, build, unit tests, and GitHub Pages deployment passed. Live Owlbear room and GM/player dual-client verification remain pending.

## 0.0.3 — Restore GitHub Pages hosting

- Serve the extension Manifest, background HTML, JavaScript, and icon from one GitHub Pages origin.
- Keep jsDelivr only for third-party SDK dependencies, not the extension entry page.
- Switch the deployment workflow from publishing a jsDelivr branch to the official GitHub Pages artifact deployment flow.
- This release changes packaging and hosting only; wall behavior and toolbar registration logic are unchanged.

## 0.0.2 — Toolbar registration fix

- Make wall tool registration idempotent across background iframe reloads.
- Follow Owlbear's documented custom-tool creation sequence and omit premature defaultMode registration.
- Add explicit success notification after the wall tool and mode are registered.
- Actual Owlbear room verification remains pending.

## 0.0.1 — Initial development slice

- Created an independent TypeScript Owlbear extension project.
- Added the minimal module registry, logging, and GM permission helper.
- Added versioned shared wall metadata with independent movement, vision, and light flags.
- Added GM-only single-segment wall drawing using hidden shared LINE items.
- Added per-client local WALL projection and reconciliation.
- Added a GM-only local guide line for editing visibility.
- Added geometry and metadata unit tests.
- Added GitHub Actions validation and GitHub Pages deployment configuration.
- Live Owlbear room and GM/player dual-client verification remain pending.
