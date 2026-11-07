# Beholder VTT — phased delivery

## Phase 0 — Engineering foundation

- [x] New project scaffold, independent of the archived WallBrush implementation.
- [x] Owlbear manifest and local development server.
- [x] Module registry, logger, and GM permission helper.
- [x] Versioned wall-source metadata schema.
- [x] Shared scene → local scene reconciliation base.
- [x] TypeScript build configuration and unit-test harness.
- [ ] Real Owlbear room smoke test.
- [ ] GM/player dual-client persistence test.

## Phase 1A — Wall projection vertical slice

- [x] GM-only wall creation.
- [x] Hidden shared LINE source.
- [x] Local WALL projection on each connected client.
- [x] Update/delete/reload reconciliation base.
- [ ] Verify update/delete/reload in a real Owlbear room.

## Phase 1B — Wall editor

- [x] Continuous polyline drawing.
- [x] Rectangle tool.
- [x] Select and move whole wall groups.
- [x] Endpoint and connected-node editing.
- [x] Eraser and whole-wall deletion.
- [x] Undo/redo actions.
- [ ] Endpoint snapping and automatic connections.
- [ ] Junction and seam tests.
- [ ] Real-room interaction and persistence acceptance.

## Phase 1C — Openings and independent spatial properties

- [ ] Door and window objects.
- [ ] Door state changes.
- [ ] Wall-relative opening anchors.
- [x] Independent movement, vision, and light blocking metadata.
- [ ] Movement collision and light-blocking adapters.
- [ ] Shared spatial query interface.

## Phase 1D — Dynamic light and fog

- [ ] Native LIGHT projection.
- [ ] Light settings and attachment.
- [ ] Vision and light occlusion adapters.
- [ ] Fog settings and token vision.
- [ ] Color/brightness rendering strategy.

Every phase requires type checking, build, unit tests, runtime testing, persistence testing, and GM/player dual-client acceptance before it is marked complete. A checked implementation item is not a phase acceptance claim.
