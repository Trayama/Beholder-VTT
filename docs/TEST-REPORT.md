# Test report — Beholder VTT 0.0.11

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

Pending GitHub Actions for this commit.

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

## Important boundary

The extension does not rewrite Owlbear's internal Move implementation. It extends the official Move tool through the documented Tool Mode API. The wall-aware mode is integrated into the official Move mode bar, and the separate Beholder movement toolbar tool no longer exists. Automated tests cannot prove event ordering and native delegation in a live room; do not mark this integration complete until the real-room checklist passes.
