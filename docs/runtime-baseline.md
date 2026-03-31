# Runtime Baseline

This document captures the current post-cutover runtime assumptions.

## Supported Node Versions

- repo root: Node `24` in `.nvmrc`
- repo root engines: `24.x`
- `workers/realtime`: Node `24` in its local `.nvmrc`

The old `uWebSockets.js` dependency is gone, so the web app no longer needs the older Node pin that existed during the migration.

## Ports

- Next.js app: `3010`
- local Wrangler worker: `8787`

## Environment Variables

### Optional

- `NEXT_PUBLIC_REALTIME_API_ORIGIN`
    - points the web app at the worker entrypoint
    - for local development it should usually be `http://localhost:8787`
    - it can be omitted when the worker is served from the same origin as the frontend

An example file exists at `.env.example`.

## Current Local Development Assumptions

- `yarn dev:app` starts the Next.js frontend against a local worker origin
- `npm run dev` inside `workers/realtime` starts the realtime worker
- auth, presence, lobby lifecycle, global chat, uploads, TicTacToe, Clicker, and Jeopardy all route through the worker runtime
- avatar and Jeopardy pack assets are stored through the worker-backed R2 layer

## Current Production Assumptions

- the frontend talks to the Worker API for realtime, uploads, and lobby state
- Durable Objects hold authoritative live lobby state
- D1 stores low-frequency metadata such as identity, lobby discovery, and lobby session history
- R2 stores public uploaded assets

## Known Constraints

- the Next.js app and the worker are still developed as two local processes
- Jeopardy pack parsing still depends on ffmpeg-related tooling in the worker-side processing flow
- the UI layer is still MUI-based; the Tailwind migration is a separate follow-up stream
