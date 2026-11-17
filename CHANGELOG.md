# Changelog

## 0.0.16 - Automatic endpoint group connections

- Connect newly drawn walls to every existing wall group whose endpoint is snapped within tolerance.
- Merge touched groups under a stable wall ID and recalculate segment indexes while preserving per-segment door/window/blocking properties.
- Keep T-junctions at segment midpoints, crossing-wall splitting, and seam acceptance open.

## 0.0.15 - Token-attached lights and light selection

- Add a selector to edit any shared light in the current scene.
- Allow GM to attach a light to a CHARACTER or MOUNT token; its local projection follows the same token.
- Reconcile attachment changes on all clients and preserve attachment across property edits.
- Keep dynamic wall-light occlusion, ambient illumination, and real-room acceptance open.

## 0.0.14 - Light properties

- Add a GM popover to edit shared light radius, source softness, falloff, and cone angles.
- Apply validated edits through the shared light source revision so every client rebuilds its local Owlbear LIGHT.
- Keep token attachment, custom color/brightness, independent wall-light occlusion, and live-room acceptance open.
## 0.0.13 - Dynamic light and scene fog groundwork

- Add shared hidden light definitions and per-client local Owlbear LIGHT projections.
- Add a GM toolbar tool that places a default-radius point light.
- Add a properties popover for light radius, source softness, falloff, and cone angles.
- Reconcile local lights after shared changes, reconnects, reloads, and duplicate projections.
- Add GM controls for Owlbear scene fog fill, base color, and drawing stroke width.
- Keep light color, brightness, editing controls, and live GM/player acceptance open.

## 0.0.12 — Doors, windows, and Windows build support

- Add door and window drawing modes to the wall editor.
- Split a wall segment when placing an opening so the wall no longer blocks through the opening.
- Keep opening segments in the parent wall group so selection, movement, and endpoint edits keep them aligned.
- Let the GM click a door to open or close it; open doors allow movement, vision, and light through.
- Give windows independent defaults: block movement, allow vision, and allow light.
- Add a shared spatial query API so movement, vision, and light adapters read the same source geometry with independent flags.
- Fix the production build on Windows by invoking the TypeScript compiler through Node.
- Keep real Owlbear GM/player room acceptance pending.

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
