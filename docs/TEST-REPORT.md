# Test report - Beholder VTT 0.0.14

## 0.0.14 light properties

- The GM properties popover edits shared outer radius, source softness, falloff, and inner/outer cone angles.
- Saving increments the shared light revision; each client reconciles its local native LIGHT projection.
- Automated validation includes accepted and rejected metadata updates. Real-room synchronization remains to be checked.

## 0.0.13 implementation record

- Shared LINE light definitions are projected into one local Owlbear LIGHT per connected client.
- Reconciliation repairs missing projections, updates stale projections, removes duplicates, and cleans up deleted sources.
- GM can place a default-radius point light from the new Lighting toolbar tool.
- GM can edit a selected light's radius, source softness, falloff, and cone angles; updates are stored on the shared source and reconciled locally.
- The global control panel reads and writes Owlbear scene fog fill, color, and stroke width settings.
- Native point-light color, brightness, property editing, token attachment, and wall light-blocking integration remain incomplete.
- Real Owlbear room verification remains required for light visibility, wall/door/window occlusion, player fog, reload, and reconnect behavior.

### 0.0.13 room checklist

1. Install or update the extension and reload the room as GM and player.
2. Confirm only GM sees the Lighting tool; place a light and confirm it appears on the player client.
3. Place a second light, reload both clients, and confirm each shared source has exactly one visible local projection.
4. Delete a shared light source as GM and confirm the local light disappears on both clients.
5. Toggle scene fog fill and change color/stroke width; confirm player client receives the room setting.
6. Test a point light behind a wall, closed door, open door, and window; record native visibility and shadow behavior.

# Test report — Beholder VTT 0.0.12

Date: 2026-11-17

## Local automated validation

- TypeScript type check: PASS.
- Production build: PASS on Windows after invoking the compiler through Node directly.
- Unit tests: PASS — 28 passed, 0 failed.

## Added behavior

- Door and window placement splits an existing wall source while preserving its wall group.
- Door state updates the shared source and rebuilds local vision projections.
- Open doors allow movement, vision, and light through. Windows allow vision and light through while blocking movement.
- The shared spatial query API returns geometry independently for movement, vision, and light-blocking consumers.

These are automated implementation checks. Real Owlbear GM/player room acceptance is still pending; use the native Move and persistence checklist below before treating the integration as accepted.

## 0.0.11 native Move validation record

## Historical report — Beholder VTT 0.0.11

Date: 2026-11-08

## Architecture change

The standalone Beholder Select + Move toolbar tool has been removed. Beholder now registers a Tool Mode directly against Owlbear's built-in Move tool.

- Canonical built-in tool ID: `rodeo.owlbear.tool/move` (singular, matching the active tool ID shown in the Beholder panel).
- The previous implementation used `rodeo.owlbear.tools/move` (plural) and hid the mode icon behind a filter for a non-existent tool ID. This prevented the mode from being properly surfaced on the native Move tool.
- The wall-aware mode is now visible in the native Move mode bar and is automatically activated whenever native Move becomes active.
- The native pass-through mode is used temporarily for transformer handles and when wall-aware movement is disabled.
- Ordinary non-token drags use Owlbear's documented `preventDrag` native Move behavior.
- The movement settings action is attached to the official Move tool and opens its own Popover.
- The old independent Beholder tool and its settings action are removed during startup.

## Automated validation

GitHub Actions run: [42455341470](https://github.com/Trayama/Beholder-VTT/actions/runs/42455341470)  
Commit: `b1874161afbfb36d0e4595658f14001de827d7bd`

| Check | Result |
|---|---|
| TypeScript type check | PASS |
| Production build | PASS |
| Unit tests | PASS — 23 passed, 0 failed |
| GitHub Pages deployment | PASS |
| Published manifest version | 0.0.11 |

## Real Owlbear room verification — required

Use one GM client and one player client in the same room.

1. Update the extension and reload the room. Confirm there is only one Move tool in the main toolbar; no separate Beholder movement tool remains.
2. Select the official Move tool. Confirm the Beholder wall-aware mode appears in its mode bar and becomes active automatically.
3. Drag a CHARACTER Token without Light toward a movement-blocking wall. Confirm it stops during the drag, with no visible crossing and snap-back.
4. Repeat from both sides of the wall and at a wall endpoint.
5. Repeat with GM-owned, player-owned and MOUNT Tokens.
6. Select multiple Tokens, drag one, and confirm group movement is constrained by every selected Token footprint.
7. Drag a PROP, MAP and DRAWING object. Confirm Owlbear's native drag behavior remains intact.
8. Drag empty space. Confirm Beholder marquee selection works, including Shift / Ctrl / Cmd additive selection.
9. Test rotation and scaling handles on CHARACTER Tokens. Confirm Owlbear's native transformer works and wall-aware mode resumes after release.
10. Disable wall-aware movement in the Move settings Popover. Confirm the official Move performs unrestricted native Token movement. Re-enable it and confirm collision mode returns.
11. Press Escape during token movement and during a transformer gesture. Confirm cancellation and mode restoration.
12. Repeat on GM and player clients simultaneously, including rapid drags, switching tools, scene reload, reconnect and extension restart.
13. Confirm the GM-authoritative MovementBlocker remains a safety net for movement performed by other tools.

## 0.0.13 lighting and fog implementation record

- Shared LINE light definitions are projected into one local Owlbear LIGHT per connected client.
- Reconciliation repairs missing projections, updates stale projections, removes duplicates, and cleans up deleted sources.
- GM can place a default-radius point light from the new Lighting toolbar tool.
- The global control panel reads and writes Owlbear scene fog fill, color, and stroke width settings.
- Native point-light color, brightness, property editing, token attachment, and wall light-blocking integration remain incomplete.
- Real Owlbear room verification remains required for light visibility, wall/door/window occlusion, player fog, reload, and reconnect behavior.

### 0.0.13 room checklist

1. Install or update the extension and reload the room as GM and player.
2. Confirm only GM sees the Lighting tool; place a light and confirm it appears on the player client.
3. Place a second light, reload both clients, and confirm each shared source has exactly one visible local projection.
4. Delete a shared light source as GM and confirm the local light disappears on both clients.
5. Toggle scene fog fill and change color/stroke width; confirm player client receives the room setting.
6. Test a point light behind a wall, closed door, open door, and window; record native visibility and shadow behavior.

## Important boundary

The extension does not rewrite Owlbear's internal Move implementation. It extends the official Move tool through the documented Tool Mode API. The wall-aware mode is integrated into the official Move mode bar, and the separate Beholder movement toolbar tool no longer exists. Automated tests cannot prove event ordering and native delegation in a live room; do not mark this integration complete until the real-room checklist passes.
