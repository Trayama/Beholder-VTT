# Test report — Beholder VTT 0.0.7

Date: 2026-11-07

## Automated validation

GitHub Actions run: [42384023507](https://github.com/Trayama/Beholder-VTT/actions/runs/42384023507)  
Commit: `edc38dbdacf7aec48cac34c1645754f9102318df`

| Check | Result |
|---|---|
| TypeScript type check | PASS |
| Production build | PASS |
| Unit tests | PASS — 18 passed, 0 failed |
| GitHub Pages build | PASS |
| GitHub Pages deployment | PASS |
| Published manifest version | 0.0.7 |

## 0.0.7 changes

- Added a dedicated Beholder wall-aware token movement tool for GM and player clients.
- Uses Owlbear's Interaction API for high-frequency token position updates.
- Applies shared LINE wall geometry with `blocksMovement=true`; does not inspect Light attachment or token creator.
- Retained the GM-side post-commit correction as a fallback for native Owlbear tools.
- GM fallback now refreshes a complete scene snapshot after item-change events rather than trusting the event payload to be a full-scene snapshot.
- Added a one-shot movement marker so the GM fallback accepts paths already checked by the Beholder tool, including valid paths around wall endpoints.
- Added pure tests for no-Light CHARACTER tokens, GM/player-created tokens, MOUNT tokens, movement-wall geometry, and validated movement markers.
- Native local WALL projections remain `blocking=false`; vision, movement, and light properties remain separate.

## Real Owlbear room verification — pending

CI does not prove real Owlbear interaction or synchronization. Test with one GM and at least one player in the same room:

1. Confirm the new Beholder movement tool appears in the right toolbar for both GM and player.
2. Move a CHARACTER token with no Light attachment through a movement-blocking wall; it should stop at the wall edge during the drag.
3. Repeat with a GM-created token and a player-created token. Neither should receive a role/creator exemption.
4. Repeat with a MOUNT token.
5. Verify a wall with `blocksMovement=false` does not constrain movement.
6. Verify a wall with `blocksMovement=true` but `blocksVision=false` still blocks movement.
7. Verify a PROP image is not treated as a character token.
8. Move a token with Owlbear's native Select tool; the GM fallback should correct it after commit.
9. Verify cancel / Escape / switching tools restores an in-progress movement to its original position.
10. Test wall endpoints, corners, narrow passages, rapid dragging, scene reload, reconnect, and extension restart.

The dedicated tool is real-time local movement constrained by the shared wall geometry. Native Owlbear Select movement remains a post-commit fallback and may visibly snap back. Do not mark movement accepted until the live-room tests pass.
