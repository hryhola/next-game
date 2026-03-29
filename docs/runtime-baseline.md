# Runtime Baseline

This document captures the current legacy runtime assumptions before the Cloudflare migration starts.

## Supported Node Version

Until `uWebSockets.js` is removed, the project should run on Node 18.

-   `.nvmrc` pins local development to `18`
-   `package.json` declares `engines.node` as `>=18 <19`

Reason:

-   the current `uWebSockets.js` dependency does not support the Node 24 runtime that is currently common on local machines and CI images

## Ports

-   Next.js app: `3000`
-   uWebSockets server: `NEXT_PUBLIC_WS_PORT`
-   current local default websocket port: `5555`

## Environment Variables

### Required

-   `NEXT_PUBLIC_WS_PORT`
    -   used by the client websocket URL builder
    -   used by the uWebSockets server bootstrap
    -   used by generated local `wsapi` URLs

### Optional Migration Flags

-   `NEXT_PUBLIC_USE_CLOUDFLARE_REALTIME`
    -   when `true`, the legacy Next.js frontend uses the new Cloudflare worker API for supported flows
    -   when `false`, the app keeps using legacy `uWebSockets`
-   `NEXT_PUBLIC_REALTIME_API_ORIGIN`
    -   points the legacy frontend at the worker entrypoint
    -   local default for `wrangler dev`: `http://localhost:8787`

An example file now exists at `.env.example`.

## Current Local Development Assumptions

-   `yarn dev` starts Next.js
-   `yarn dev:worker-api` starts Next.js with the worker bridge enabled
-   the realtime server is initialized from `pages/index.tsx` server-side execution
-   local uploads write into `public/res`

When the worker bridge flag is enabled:

-   `pages/index.tsx` skips legacy socket bootstrap
-   auth/session bootstrap comes from the worker `/auth/session` endpoint
-   supported legacy UI flows are routed through the worker backend:
    -   login
    -   lobby list and preview
    -   TicTacToe create/join/leave/destroy
    -   lobby chat
    -   ready checks
    -   TicTacToe gameplay
-   unsupported legacy UI remains intentionally disabled:
    -   global chat
    -   global users list
    -   avatar uploads
    -   non-TicTacToe games
    -   legacy timer-driven flows

## Current Production Assumptions

-   `node prod-server.js` starts a custom HTTPS Next.js server on port `3000`
-   the websocket server runs separately through `uWebSockets.js`
-   production uploads write into `/var/www/game-club.click/html/res`
-   SSL cert paths resolve from either:
    -   `cert/cert.pem` and `cert/key.pem`
    -   or LetsEncrypt paths under `/etc/letsencrypt/live/game-club.click/`

## Known Baseline Constraints

-   `uWebSockets.js` is a native dependency and currently blocks `next build` on unsupported Node versions
-   websocket, room, and user state are stored in process memory
-   profile and lobby uploads currently rely on local filesystem writes
-   Jeopardy pack parsing depends on local file access and ffmpeg tooling
