# Frontend Boundaries

This frontend keeps lobby routing and game features intentionally separate.

## Route Shells

Route-level shells such as `client/route/frames/LobbyFrame.tsx` may handle only concerns that exist for every lobby regardless of the selected game:

- lobby membership updates
- lobby chat hydration and generic lobby/system messages
- ready checks
- kick/destroy/leave routing
- shared subscriptions and route-level loading behavior

They must not contain game rules, game-specific announcements, or game-specific UI reactions to realtime events.

## Game Features

Each game owns its own realtime reactions inside its feature tree, for example under `client/features/games/jeopardy/`.

Game-specific code belongs there when it:

- interprets `Game-SessionAction` payloads
- turns game actions into chat announcements
- plays game-specific sounds
- shows game-only overlays, badges, timers, or hints
- depends on a game's session/frame/action contract

## Practical Rule

If a change needs knowledge of Jeopardy, Clicker, TicTacToe, or any other game's action names, frame ids, or rules, it should not go into `LobbyFrame`.

Instead:

1. Put generic lobby behavior in `LobbyFrame`.
2. Put game-specific behavior in the relevant game component or hook.
3. Add or update tests on both sides when a boundary is easy to regress.
