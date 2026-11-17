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
- [x] Free positioning and optional grid snapping.
- [ ] Endpoint snapping and automatic connections.
- [ ] Junction and seam tests.
- [ ] Real-room interaction and persistence acceptance.

## Phase 1C — Openings and independent spatial properties

- [x] Door and window objects, drawn directly onto an existing wall segment.
- [x] Door state changes; opening a door removes its movement, vision, and light blocking.
- [x] Wall-relative opening anchors; openings remain in the wall group and follow group edits.
- [x] Independent movement, vision, and light blocking metadata.
- [x] GM-authoritative post-commit movement correction.
- [ ] Independent light-blocking adapter.
- [x] Shared spatial query interface for movement, vision, and light-blocking consumers.
- [ ] GM/player movement-collision acceptance, including MOUNT tokens and multiple simultaneous moves.

## Phase 1D — Dynamic light and fog

- [x] Shared hidden light definitions and local native LIGHT projections.
- [x] GM point-light placement tool with a default profile.
- [x] GM editor for radius, source softness, falloff, and cone angles.
- [x] Local projection reconciliation after scene change, reload, and reconnect.
- [x] GM controls for scene fog fill, base color, and drawing stroke width.
- [ ] Attachment to character tokens.
- [ ] Verify vision and light occlusion against walls, doors, and windows in Owlbear.
- [ ] Ambient illumination and custom color/brightness rendering strategy.
- [ ] GM/player fog and light persistence acceptance.

Every phase requires type checking, build, unit tests, runtime testing, persistence testing, and GM/player dual-client acceptance before it is marked complete. A checked implementation item is not a phase acceptance claim.
