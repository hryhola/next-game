# Realtime Worker Scaffold

This package contains the first Cloudflare Workers + Durable Objects scaffold for the migration.

## What Exists

-   a Worker entrypoint in `index.ts`
-   one Durable Object class in `durable-objects/LobbyRoomDO.ts`
-   a `wrangler.jsonc` config with the first Durable Object binding and migration
-   a local TypeScript config for the worker package

## What It Does

The scaffold intentionally stays small:

-   `GET /health` returns a worker health response
-   `GET /rooms/:roomId/state` returns basic room metadata from Durable Object storage
-   `GET /rooms/:roomId/health` returns room health
-   `GET /rooms/:roomId/websocket` upgrades to a websocket handled by the room Durable Object

The room object currently:

-   initializes persistent room metadata in Durable Object storage
-   tracks active websocket connections in memory
-   broadcasts basic presence and echo messages

## Node Version

This worker package is intentionally isolated from the legacy app.

-   root app runtime: Node 18
-   worker toolchain runtime: Node 20+

Use the local `.nvmrc` inside this folder before installing or running `wrangler`.

## Commands

Run these inside `workers/realtime`:

```bash
nvm use
npm install
npm run typegen
npm run check
npm run dev
```

## Notes

-   R2 and D1 bindings are not added yet because the first scaffold slice only needs Durable Objects
-   this package is not wired into the frontend yet
-   the current room logic is only a runtime scaffold, not the migrated game/lobby domain logic
