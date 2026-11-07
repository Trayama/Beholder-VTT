# Test report — Beholder VTT 0.0.1

Date: 2026-11-07

## Automated checks (re-run before repository import)

| Check | Result | Notes |
|---|---|---|
| TypeScript typecheck | PASS | `tsc -p tsconfig.json --noEmit` |
| Build | PASS | `node scripts/build.mjs` |
| Geometry tests | PASS | Coordinate transform, point-to-segment distance, intersection, segment distance |
| Metadata tests | PASS | Independent blocking flags, valid/invalid source metadata, local projection marker |
| Total automated tests | PASS | 8 passed, 0 failed |
| Local development manifest | PASS | `http://localhost:5173/manifest.json` returned HTTP 200 with local asset URLs |
| Local background page | PASS | `/background.html` returned HTTP 200 |

## Deployment setup

- Production manifest points to `https://trayama.github.io/Beholder-VTT/`.
- GitHub Actions workflow builds and tests the project, then deploys `dist/` to Pages on pushes to `main` or `develop`.
- Repository Pages source must be set to **GitHub Actions** once in Settings → Pages.

## Not yet verified

The extension has not yet been installed into a live Owlbear room in this environment. These acceptance checks remain pending:

- GM can draw a wall in a real room.
- Player client creates a local WALL for the same shared LINE.
- GM guide is visible only to GM.
- Editing the shared source updates both local projections.
- Deleting the shared source removes both local projections.
- Scene reload recreates local projections without duplicates.
- Reconnecting a player restores projections.

A successful TypeScript build and unit-test run are not treated as proof of live Owlbear functionality.
