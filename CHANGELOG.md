# Changelog

## 0.0.2 — Toolbar registration fix

- Make wall tool registration idempotent across background iframe reloads.
- Follow Owlbear's documented custom-tool creation sequence and omit premature `defaultMode` registration.
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
