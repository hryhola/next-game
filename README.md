# Game Club

This repo now uses a split architecture:

- the Next.js frontend lives in the repo root
- realtime, presence, uploads, and room state live in `workers/realtime`

## Local Development

Start the worker first:

```bash
cd workers/realtime
nvm use
npm install
npm run db:migrate:local
npm run dev
```

Then start the web app from the repo root:

```bash
nvm use
yarn install
yarn dev:app
```

Open `http://localhost:3010`.

For local development, `NEXT_PUBLIC_REALTIME_API_ORIGIN` should usually point at Wrangler, for example `http://localhost:8787`. When the worker is served from the same origin as the frontend, that variable can be omitted.

## Current Stack

- Next.js frontend
- Cloudflare Workers + Durable Objects realtime backend
- D1 for identity, lobby index, and room history metadata
- R2 for uploaded assets
- Jeopardy pack parsing and gameplay on the Worker runtime

## Useful Docs

- `docs/cloudflare-migration-plan.md`
- `docs/frontend-boundaries.md`
- `docs/runtime-baseline.md`
- `tools/siq-cli/README.md`
- `workers/realtime/README.md`

## SIQ CLI

Use the repo-local SIQ pack tool to scaffold or build Jeopardy packs:

```bash
yarn siq boilerplate my_pack
yarn siq build my_pack
```
