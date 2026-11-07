# Test report — Beholder VTT 0.0.6

Date: 2026-11-07

## Automated validation

GitHub Actions run: [42375285389](https://github.com/Trayama/Beholder-VTT/actions/runs/42375285389)  
Commit: `b96b5361473dd032943217794a50c2de68550671`

| Check | Result |
|---|---|
| TypeScript type check | PASS |
| Production build | PASS |
| Unit tests | PASS — 12 passed, 0 failed |
| GitHub Pages build | PASS |
| GitHub Pages deployment | PASS |
| Published manifest version | 0.0.6 |

## 0.0.6 changes covered by automated validation

- Unified left-top control panel and its toolbar / snap / endpoint / guide / wall-property / undo / redo / clear controls.
- Free-position drawing and optional grid snapping, including temporary Ctrl / Cmd bypass.
- Reordered right-side wall modes and always-visible properties action.
- GM-authoritative post-commit movement correction for CHARACTER and MOUNT image tokens.
- Independent wall movement / vision / light metadata remains intact; local native WALL blocking stays disabled.

## Real Owlbear room verification — pending

CI does not prove real Owlbear interaction or synchronization. The following still require a GM and a player in the same room:

1. Left-top control panel opens and every visible control works.
2. Toolbar hide / show registers and removes the right-side tool without affecting shared wall data.
3. Free drawing places endpoints at the pointer position; grid mode snaps; Ctrl / Cmd temporarily bypasses grid.
4. Select, line, polyline, rectangle, erase, property editing, undo and redo work.
5. A player moving a CHARACTER token through a movement-blocking wall is corrected by the connected GM client.
6. The same collision check works for MOUNT tokens, multiple wall segments, corners, and rapid repeated moves.
7. Player clients receive local vision WALL projections but never GM helper lines.
8. Scene reload, reconnect, and extension restart rebuild local projections without duplicates.
9. No repeated success notifications occur during normal Beholder operations.

Movement correction is post-commit and may briefly snap a token back. It is not a native pre-move lock or pathfinding implementation. Do not mark the movement system accepted until the live-room tests above pass.
