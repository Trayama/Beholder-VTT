# Test report — Beholder VTT 0.0.10

Date: 2026-11-08

## Change under test

The official Owlbear Move tool remains the active toolbar entry. Beholder registers two hidden Tool Modes against `rodeo.owlbear.tools/move`:

- **Collision mode:** CHARACTER / MOUNT drags use Beholder's existing real-time wall collision and group movement.
- **Native pass-through mode:** delegates ordinary objects, empty-space marquee selection, locked targets and transform handles to Owlbear's native interaction. It is also selected when the takeover setting is disabled.

The old behavior that redirected the official Move button to Beholder's separate tool has been removed. The standalone Beholder Select + Move tool remains available as a fallback.

## Automated validation

Pending GitHub Actions for this commit.

## Real Owlbear room verification — required

Use one GM client and one player client in the same room.

1. Select the official Owlbear Move button. Confirm it remains selected; it must not switch to the Beholder tool.
2. Drag a CHARACTER Token without Light toward a movement-blocking wall. Confirm it stops at the wall during the drag, with no visible crossing and snap-back.
3. Repeat from both sides of the wall and at a wall endpoint.
4. Repeat with GM-owned, player-owned and MOUNT Tokens.
5. Select multiple Tokens, drag one, and confirm group movement is constrained by every selected Token footprint.
6. Drag a PROP, MAP and DRAWING object. Confirm Owlbear's native drag behavior remains intact.
7. Drag empty space. Confirm Owlbear's native marquee selection still works.
8. Test single-click selection and Shift / Ctrl / Cmd additive selection.
9. Test rotation and scaling handles on CHARACTER Tokens. Confirm the native transformer operates and the collision mode resumes after release.
10. Press Escape during token movement and during a transformer gesture. Confirm cancellation and mode restoration.
11. Disable takeover in Beholder global settings while the official Move tool is active. Confirm native Token movement is restored. Re-enable it and confirm collision mode is restored.
12. Repeat the above with GM and player clients simultaneously, including rapid successive drags, tool switching, scene reload, reconnect and extension restart.
13. Confirm the GM-authoritative MovementBlocker remains a safety net for movement performed by other tools.

## Important boundary

The extension does not modify Owlbear's internal Move implementation or hide its toolbar icon. It uses the documented Tool Mode API to receive native Move pointer events and delegates selected gestures back to Owlbear's default drag behavior. Automated tests cannot prove the event ordering and delegation behavior in a live room; do not mark this integration complete until the real-room checklist passes.
