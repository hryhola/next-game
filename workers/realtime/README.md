# Realtime Worker

This package contains the active Cloudflare Workers + Durable Objects migration runtime.

## What Exists

- a Worker entrypoint in `index.ts`
- Durable Object classes in `durable-objects/LobbyDO.ts` and `durable-objects/GlobalPresenceDO.ts`
- a D1-backed identity/session layer in `auth/store.ts`
- a D1-backed lobby index in `lobbies/store.ts`
- a D1-backed lobby session summary store in `lobby-sessions/store.ts`
- an R2-backed asset store in `assets/store.ts`
- a local test playground served from `/playground`
- a `wrangler.jsonc` config with Durable Object bindings, D1 binding, and migrations
- a local TypeScript config for the worker package

## What It Does

The current worker already supports a real localhost migration slice:

- `GET /health` returns a worker health response
- `POST /auth/register` creates a persistent user profile and session token in D1
- `GET /auth/session` resolves the current cookie/bearer token to a persistent identity
- `POST /auth/logout` revokes the current session and clears the cookie
- `PATCH /auth/profile` and `POST /auth/profile` update nickname/color metadata and can upload avatars to R2
- `GET /assets/:assetId` serves public uploaded assets from R2 through the worker
- `GET /lobbies` lists active DO-backed lobbies from the D1 index
- `POST /lobbies` creates a DO-backed TicTacToe, Clicker, or Jeopardy lobby
- `DELETE /lobbies/:lobbyId` destroys a lobby
- `POST /lobbies/:lobbyId/join` joins a lobby over HTTP for the main Next.js app
- `POST /lobbies/:lobbyId/leave` leaves a lobby over HTTP for the main Next.js app
- `GET /presence/state` returns the current DO-managed online user snapshot
- `GET /presence/websocket` upgrades to a global presence websocket backed by a Durable Object
- `GET /lobbies/:lobbyId/state` returns the authoritative lobby snapshot from Durable Object storage
- `GET /lobbies/:lobbyId/history` returns low-frequency lobby session summaries from D1
- `GET /lobbies/:lobbyId/health` returns room health
- `GET /lobbies/:lobbyId/websocket` upgrades to a websocket handled by the room Durable Object
- `GET /playground` serves a local browser-based test harness for the new flow

The new identity/presence layer currently:

- stores user profiles and session references in D1
- stores uploaded asset metadata in D1
- stores lobby session start/completion/abandonment summaries in D1
- reuses the legacy `token` cookie name for an easier frontend migration
- keeps online presence in a dedicated Durable Object instead of Node process memory
- broadcasts websocket presence snapshots that survive reconnects within the worker runtime

The room object currently owns the Phase 5, 6, and 7 slice:

- lobby creation and destruction
- join and leave flow
- member tracking and reconnect-aware connection state
- ready checks
- lobby chat
- TicTacToe session lifecycle and move validation
- Clicker session lifecycle, action fanout, and Durable Object alarm scheduling
- Jeopardy pack upload, parsing, gameplay, media flow, and score control
- lobby snapshot fanout over websocket

## Node Version

This worker package is intentionally isolated from the root web app.

- root app runtime: Node 24
- worker toolchain runtime: Node 24

Use the local `.nvmrc` inside this folder before installing or running `wrangler`.

## Commands

Run these inside `workers/realtime`:

```bash
nvm use
npm install
npm run db:migrate:local
npm run typegen
npm run check
npm run dev
```

Then open:

```bash
http://localhost:8787/playground
```

Use separate browser tabs to simulate two players. The playground stores the auth token in per-tab `sessionStorage`, so tabs can act as different users on the same local worker.

## Notes

- D1 is now used only for low-frequency durable metadata
- D1 also keeps the lobby discovery index for active rooms
- D1 now also stores lobby session history for recovery, debugging, and future stats screens
- R2 now stores public avatar assets and Jeopardy pack assets
- the main Next.js app can be started against this worker with:
    - `yarn dev:app` from the repo root
    - plus `npm run dev` inside `workers/realtime`
- the root app now routes all migrated game flows through this worker:
    - auth/register/logout/session bootstrap
    - profile nickname/color/avatar updates
    - lobby list, preview, and live list updates
    - global chat
    - global users list and count
    - TicTacToe, Clicker, and Jeopardy lobby create/join/leave/destroy
    - lobby chat
    - lobby tip and kick actions
    - ready checks
    - TicTacToe gameplay
    - Clicker gameplay, including timed click-enable and cooldown flow
    - Jeopardy gameplay, including media timing and manual score changes
- `/playground` remains the fastest low-level worker test harness
