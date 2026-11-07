# Test report — Beholder VTT 0.0.9

Date: 2026-11-08

## Automated validation

CI validation is pending for this commit. Record the exact workflow run, test count, and Pages deployment result after the workflow completes.

## 0.0.9 changes

- Replaced the failed native Select binding experiment with a dedicated Beholder Select + Move tool.
- Clicking Owlbear's built-in Move tool is redirected to Beholder when global takeover is enabled.
- CHARACTER / MOUNT drags use real-time collision against shared LINE wall geometry.
- Multi-selection moves as a group; any selected Token collision constrains the group delta.
- Non-token drags use Owlbear's default drag behavior through the documented `preventDrag` filter.
- Empty-space drags perform bounding-box marquee selection.
- Added a movement settings Popover for group movement.
- Moved wall drawing preferences, history controls, wall clearing and wall properties into a dedicated wall settings Popover.
- Simplified the top-left panel to global settings, module status and scene status.
- Retained the GM-authoritative MovementBlocker as a safety net.
- Removed the unsuccessful native Select mode-binding experiment.

## Real Owlbear room verification — pending

Test with one GM and one player:

1. Confirm Beholder's Select + Move tool appears and becomes active.
2. With global takeover enabled, click Owlbear's native Move tool. Confirm the active tool returns to Beholder.
3. Drag a CHARACTER Token without Light through a movement-blocking wall. It should stop during drag.
4. Repeat with GM-created, player-created and MOUNT Tokens.
5. Select multiple Tokens and drag one. The group should move together and stop when any Token reaches a blocking wall.
6. Disable group movement and confirm only the dragged Token moves.
7. Drag a PROP, MAP and DRAWING object. Confirm Owlbear's default drag behavior remains available.
8. Drag empty space and confirm marquee selection; test Shift / Ctrl / Cmd additive selection.
9. Test locked Tokens, locked props, rapid drag, Escape / cancel, switching tools mid-drag, scene reload, reconnect and extension restart.
10. Disable native Move takeover and confirm the Owlbear Move tool works again and the GM safety net still corrects wall crossing.
11. Test Token rotation and scaling with takeover both enabled and disabled. Record any regression before removing the native fallback.

The public SDK does not expose a supported API to hide the built-in Move icon. The takeover redirects tool activation; it does not remove the built-in icon. Do not claim the icon is hidden.
