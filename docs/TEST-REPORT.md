# Test report — Beholder VTT 0.0.4

Date: 2026-11-07

## Automated checks

GitHub Actions run: [42370150770](https://github.com/Trayama/Beholder-VTT/actions/runs/42370150770)

| Check | Result | Notes |
|---|---|---|
| TypeScript typecheck | PASS | `npm run typecheck` |
| Build | PASS | `node scripts/build.mjs` |
| Existing unit tests | PASS | 8 passed, 0 failed |
| Production manifest build | PASS | Action popover and background URLs point to GitHub Pages |
| GitHub Pages deployment | PASS | `develop` build published to `gh-pages` |

## New editor surface

- Left-top global control page is included in the deployment.
- Right-side wall tool registers five modes and seven actions.
- Wall property page and mode icons are included in the deployment.
- Local preferences are separated from shared scene data.

## Not yet verified in a live Owlbear room

The automated build does not prove the editor works correctly inside a real Owlbear room. These acceptance checks remain pending:

- Top-left control popover opens and its toolbar visibility toggle registers/removes the right-side tool.
- GM can use all five modes and all seven actions.
- Continuous walls remain connected when a node is dragged.
- Wall property changes update all segments in a wall group and all clients' local projections.
- Player clients receive local WALL projections but never GM helper lines.
- Undo/redo, delete, clear, scene reload, and reconnect behave correctly.
- Large maps remain responsive during editing and synchronization.

A successful CI run is not treated as proof of live runtime functionality. Do not mark the phase accepted until these checks pass in an actual GM/player room.
