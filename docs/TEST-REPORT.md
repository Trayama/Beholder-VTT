# Test report — Beholder VTT 0.0.8

Date: 2026-11-07

## Automated validation

GitHub Actions validation is pending for this commit. Update this section with the exact workflow run, commit SHA, test count, and Pages deployment result after CI completes.

## 0.0.8 changes

- Added a local binding control for the Owlbear native Select tool.
- Added a native Select tool-mode bridge using SDK `createMode`, `activateMode`, `onToolChange`, `onToolDown`, and `onToolUp`.
- Normal CHARACTER / MOUNT drags use shared LINE wall geometry and the Interaction API.
- Selected groups move as one unit; the earliest token collision constrains the group delta.
- Non-token drags, blank-space marquee selection, and transformer gestures temporarily delegate to Owlbear's default drag mode.
- Kept the independent wall-aware movement tool as a fallback until real-room verification.
- Added unit tests for group movement constraints and native Select tool ID detection.
- Wall geometry, local WALL projections, and movement / vision / light properties remain independent.

## Real Owlbear room verification — pending

The SDK exposes custom modes, mode activation, active-tool change events and a pass-through drag filter, but automated tests cannot prove that a custom mode can safely augment the built-in Select tool in a live room.

Test with one GM and one player:

1. Open Beholder control panel while Owlbear's native Select tool is active. Confirm the active tool ID and bind it on each client if it was not auto-detected.
2. Switch away from Select and back. Confirm the Beholder collision mode automatically reactivates.
3. Click a CHARACTER Token; confirm native selection and deselection still work.
4. Drag a CHARACTER Token with no Light through a movement-blocking wall. It should stop during drag.
5. Repeat with GM-created, player-created and MOUNT Tokens.
6. Select two or more Tokens and drag one. The group should move together and stop when any Token reaches a blocking wall.
7. Drag a PROP, MAP or DRAWING object. It should retain native Owlbear movement.
8. Drag empty space. Native marquee selection should work.
9. Use rotation and scale handles on a selected Token. Native transformer behavior should work.
10. Test Shift / Ctrl / Cmd selection, locked items, rapid dragging, cancel / Escape, switching tools mid-drag, scene reload, reconnect and extension restart.
11. Confirm the separate Beholder wall-aware movement tool remains available as fallback.

If the native Select bridge disrupts any normal selection or transformer interaction, unbind it from the control panel; the standalone wall-aware movement tool remains available. Do not remove the fallback or mark the bridge complete until live-room tests pass.
