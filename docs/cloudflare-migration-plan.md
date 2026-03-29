# Cloudflare Migration Plan

## Goal

Migrate the project from a stateful Next.js + uWebSockets.js server model to this target stack:

-   Keep Next.js for the frontend
-   Move realtime and authoritative room logic to Cloudflare Workers + Durable Objects
-   Move uploaded assets to R2
-   Add D1 only for metadata that must survive process restarts

This document is written as an execution plan so the migration can be done step by step without rewriting the whole project in one shot.

## Why This Stack Fits This Repo

The current app is not just "Next.js with websockets". It is a stateful multiplayer system where:

-   the socket server is initialized from `pages/index.tsx`
-   user, lobby, game, and chat state live in process memory
-   domain objects publish directly through `uWebSockets`
-   uploads assume local disk
-   some game flows depend on timers and long-lived process state

Cloudflare Durable Objects are the closest serverless primitive to the current architecture because each lobby can become an authoritative room object with its own state, connections, and timers.

## Current Hotspots To Refactor

These files are the main coupling points that drive the migration order:

-   `pages/index.tsx`
-   `uWebSockets/createSocketServer.ts`
-   `uWebSockets/ws/index.ts`
-   `state/AppState.ts`
-   `state/lobby/Lobby.ts`
-   `state/common/game/GameSession.ts`
-   `state/user/User.ts`
-   `util/formDataRequest.ts`
-   `pages/api/profile.ts`
-   `pages/api/lobby-create.ts`
-   `state/games/jeopardy/JeopardyPack.ts`

## Migration Principles

1. Do not migrate transport, persistence, and UI all at once.
2. Keep game rules as intact as possible; extract interfaces around them first.
3. Migrate one game end to end before touching the rest.
4. Start with `TicTacToe`, then `Clicker`, then `Jeopardy`.
5. Treat file uploads and Jeopardy media parsing as a separate infrastructure track.
6. Prefer additive migration with feature flags over a big-bang cutover.

## Target Architecture

### Frontend

-   Next.js remains the web app
-   frontend talks to:
    -   HTTP endpoints for auth/profile/upload metadata
    -   a websocket endpoint backed by Durable Objects for room and global realtime events
-   UI and feature code stay mostly in `client/` and `pages/` until backend migration is stable

### Realtime Backend

-   A Cloudflare Worker becomes the entry point
-   Durable Objects become authoritative room actors
-   each lobby maps to one Durable Object instance
-   websocket fanout, room membership, presence, and game session state move there

### Storage

-   R2 stores:
    -   avatars
    -   uploaded lobby assets
    -   Jeopardy packs
    -   optional processed media artifacts
-   D1 stores only durable metadata, for example:
    -   user profiles
    -   asset metadata
    -   durable lobby metadata if required
    -   room snapshots if restart recovery is needed

### Domain Layer

The long-term shape should separate:

-   `domain`: game and lobby rules
-   `contracts`: shared message and payload types
-   `platform`: Cloudflare-specific implementations
-   `web`: Next.js frontend

## Suggested End-State Repo Shape

This is a recommendation, not a required first step:

```text
client/
pages/
docs/
shared/
  contracts/
  domain/
workers/
  realtime/
```

If you want a smaller first refactor, keep the current repo structure and only introduce:

-   `shared/contracts`
-   `shared/domain`
-   `workers/realtime`

## Phases

## Phase 0: Stabilize The Current Baseline

### Objective

Make the current repo safe enough to refactor without mixing migration work with existing runtime noise.

### Tasks

-   Remove the invalid `excludeFile` option from `next.config.js`
-   Pin the legacy app to a supported Node version while `uWebSockets.js` still exists
-   Fix the flaky zero-delay `DelayedEvent` test
-   Document all current env vars and ports
-   Add a basic architecture note for current message flows if needed

### Deliverables

-   clean `build`, `lint`, and `test` baseline for the legacy app
-   documented current runtime assumptions

### Done When

-   the current app can still run locally
-   baseline CI noise is reduced
-   migration branches can be compared against a stable starting point

## Phase 1: Extract Shared Contracts

### Objective

Create a transport-independent contract layer shared by frontend and new backend.

### Tasks

-   Introduce a `shared/contracts` directory
-   Define versioned message envelopes for websocket traffic
-   Define request and event names in one place
-   Move payload types out of `uWebSockets/uws.types.ts` over time
-   Keep adapters so the old frontend can still talk to the legacy backend during transition

### Recommended Contract Shape

```ts
type ClientMessage = {
    type: string
    roomId?: string
    requestId?: string
    token?: string
    payload?: unknown
}

type ServerMessage = {
    type: string
    roomId?: string
    requestId?: string
    payload?: unknown
    error?: {
        message: string
        code?: string
    }
}
```

### Deliverables

-   shared message types
-   shared event names
-   transport-neutral payload definitions

### Done When

-   frontend code no longer imports message types directly from `uWebSockets/*`
-   message contracts are owned by shared code instead of the current transport layer

## Phase 2: Extract Domain Ports From The Current State Layer

### Objective

Preserve the current game logic while removing direct dependency on `uWebSockets` and process-local globals.

### Tasks

-   Replace direct publisher calls with interfaces
-   Remove static `State.act` usage over time
-   Introduce interfaces such as:
    -   `RealtimeBus`
    -   `RoomConnection`
    -   `Scheduler`
    -   `AssetStore`
    -   `UserStore`
-   Refactor `Lobby`, `Game`, `GameSession`, and `User` so they depend on ports, not `uWebSockets`
-   Move reusable game logic into `shared/domain`

### Minimum Ports

```ts
interface RealtimeBus {
    publishRoom(roomId: string, message: unknown): void
    publishGlobal(message: unknown): void
    sendToConnection(connectionId: string, message: unknown): void
}

interface Scheduler {
    setTimeout(key: string, delayMs: number, handler: () => Promise<void> | void): Promise<void> | void
    clearTimeout(key: string): Promise<void> | void
}

interface AssetStore {
    put(key: string, value: ArrayBuffer | Uint8Array, contentType?: string): Promise<string>
    getUrl(key: string): Promise<string>
}
```

### Deliverables

-   domain code that can run outside Next.js and outside `uWebSockets`
-   adapters for old transport and new transport

### Done When

-   game and lobby logic can run in tests without importing `uWebSockets.js`
-   new runtime adapters can be added without touching core game rules

## Phase 3: Scaffold Cloudflare Worker And Durable Object Runtime

### Objective

Add the new runtime without switching the app over yet.

### Tasks

-   Create `workers/realtime`
-   Add Worker entrypoint
-   Add one Durable Object class for lobby rooms
-   Add a global router in the Worker
-   Add local dev configuration and secrets management
-   Add bindings for:
    -   Durable Objects
    -   R2
    -   D1, only if used in the first slice

### Implementation Note

The Worker scaffold lives in its own package under `workers/realtime`.

Reason:

-   the legacy app is currently pinned to Node 18 because of `uWebSockets.js`
-   current `wrangler` tooling requires a newer Node runtime
-   isolating the Worker toolchain avoids forcing both runtimes into the same root package

### First Objects To Introduce

-   `LobbyRoomDO`
-   optional `GlobalHubDO` if you want centralized lobby list broadcasting

### Deliverables

-   Cloudflare runtime scaffold
-   local development story for Worker + web app
-   empty DO lifecycle with testable endpoints

### Done When

-   the Worker can start locally
-   a Durable Object instance can be created and addressed by room id

## Phase 4: Migrate Auth, Identity, And Presence

### Objective

Stop relying on in-memory users tied to raw websocket objects.

### Tasks

-   Define how auth tokens will work in the new stack
-   Move profile fields off in-memory `User` state
-   Persist minimal user/profile data in D1 or keep profile data elsewhere if you already have a preferred auth provider
-   Replace current online tracking with DO-managed connection state
-   Replace `ping`-driven online state with heartbeat or websocket lifecycle owned by the DO

### Recommendation

Use a thin auth layer first:

-   keep cookie-based session token flow if you want a smaller migration
-   persist only profile metadata and session references
-   do not attempt a full auth-platform migration in the same phase unless necessary

### Deliverables

-   persistent identity model
-   room presence not tied to Node process memory

### Done When

-   reconnecting users are resolved without relying on the old `UserRegistry`
-   presence survives frontend reconnects

## Phase 5: Migrate Lobby Lifecycle

### Objective

Move lobby creation, join/leave, ready checks, and chat to Durable Objects.

### Tasks

-   Map one lobby to one Durable Object instance
-   Move these flows first:
    -   create lobby
    -   join lobby
    -   leave lobby
    -   ready check
    -   lobby chat
    -   lobby member updates
-   Decide what metadata is room-local and what must live in D1
-   Keep a global lobby index outside the room if public discovery is needed after object restarts

### Suggested Rule

-   authoritative room state lives in the Durable Object
-   searchable metadata lives in D1 only if it must be queryable outside the room

### Deliverables

-   one fully working DO-backed lobby flow
-   frontend connected to new room lifecycle endpoints

### Done When

-   users can create and join a lobby through the new runtime
-   lobby list and room state no longer depend on `appState` in Next.js

## Phase 6: Migrate One Game End To End

### Objective

Prove the new architecture with the simplest complete game slice.

### Recommended First Game

`TicTacToe`

Why:

-   simple room state
-   minimal asset concerns
-   deterministic session flow
-   low timer complexity

### Tasks

-   move `TicTacToe` rules into the extracted domain layer
-   execute game actions inside the room Durable Object
-   send session updates to connected clients through the DO
-   migrate only the frontend networking layer needed for this game

### Deliverables

-   one lobby type with one game working entirely on the new backend

### Done When

-   a user can create a TicTacToe lobby, join it, start a session, and finish a game without touching the legacy backend

## Phase 7: Add Scheduler Strategy For Timed Events

### Objective

Replace Node timers and `node-schedule` assumptions with a Cloudflare-friendly timing model.

### Tasks

-   define the `Scheduler` port
-   move `DelayedEvent` usage behind it
-   use Durable Object alarms where room-owned timers are needed
-   review any timing assumptions in `Clicker` and `Jeopardy`

### Special Attention

-   timers should be idempotent
-   timer callbacks should be safe if replayed or resumed
-   room state changes should be written before scheduling follow-up actions

### Deliverables

-   timer abstraction
-   Cloudflare-backed room timer implementation

### Done When

-   no game code depends directly on Node timers or `node-schedule`

## Phase 8: Migrate Uploads And Asset Access To R2

### Objective

Remove local filesystem assumptions from profile uploads and game assets.

### Tasks

-   replace `parseForm` storage destination logic
-   upload avatars to R2
-   upload lobby assets to R2
-   store asset metadata and ownership records if needed
-   update the frontend to consume returned asset URLs instead of assuming `/public/res/*`

### Jeopardy-Specific Plan

-   store uploaded pack files in R2
-   decide where pack parsing happens:
    -   Option A: parse on upload in a Worker-compatible way
    -   Option B: parse in a separate processing job if ffmpeg remains necessary
-   persist parsed metadata separately so gameplay does not depend on reparsing the archive every time

### Important Note

`Jeopardy` is the hardest part of this migration because current parsing uses zip/xml parsing plus ffmpeg-based media inspection. Do not make this the first migrated feature.

### Deliverables

-   R2-backed uploads
-   asset URLs detached from local disk

### Done When

-   avatar and lobby asset flows no longer write to local filesystem

## Phase 9: Add D1 Only Where It Pays Off

### Objective

Use D1 intentionally instead of turning it into a dumping ground for all room state.

### Good D1 Candidates

-   user profile metadata
-   room discovery metadata
-   upload metadata
-   Jeopardy pack metadata
-   audit/debug records if useful

### Poor D1 Candidates

-   high-frequency room action logs used only during live sessions
-   every transient per-turn game mutation
-   websocket connection state

### Recommendation

Keep active session state in Durable Objects. Use D1 for lookup, recovery, and metadata.

### Deliverables

-   minimal schema
-   clear ownership rules for what goes to D1 and what stays in room memory

### Done When

-   D1 is being used for durable metadata, not as a replacement for authoritative room runtime

## Phase 10: Cut Over The Frontend Networking Layer

### Objective

Switch the frontend from the legacy socket/API layer to the new backend incrementally.

### Tasks

-   replace `client/network-utils/socket.ts` with a provider-based client for the new websocket endpoint
-   move frontend message registration to the shared contracts
-   migrate HTTP helpers to new upload/profile/lobby endpoints as they become available
-   keep a feature flag for old vs new runtime during rollout

### Deliverables

-   frontend runtime switch
-   compatibility mode during transition

### Done When

-   selected features route entirely to the new backend
-   old `uWebSockets` handlers are no longer required for migrated flows

## Phase 11: Decommission The Legacy Runtime

### Objective

Remove the old server once all critical flows are migrated.

### Tasks

-   remove `uWebSockets` server bootstrap
-   remove legacy ws handlers
-   remove old publisher wrapper and app state globals
-   remove local upload path assumptions
-   remove unused deps such as:
    -   `uWebSockets.js`
    -   legacy transport types
    -   stale MUI engine packages if UI migration also lands

### Deliverables

-   cleaner dependency graph
-   no Next.js server-side bootstrapping of realtime state

### Done When

-   `pages/index.tsx` no longer initializes the socket server
-   build and runtime do not depend on `uWebSockets.js`

## Recommended Execution Order

If you want the safest path, do the migration in this order:

1. Baseline cleanup
2. Shared contracts
3. Domain ports
4. Worker + DO scaffold
5. Auth/presence
6. Lobby lifecycle
7. TicTacToe end-to-end
8. Scheduler abstraction
9. R2 uploads
10. Clicker
11. Jeopardy metadata and asset pipeline
12. Full cutover
13. Legacy cleanup

## Parallel Workstream: Tailwind Migration

This can begin after contracts and frontend network boundaries are stable.

### Recommended Order

1. app shell
2. buttons / inputs / dialogs / tabs
3. shared layout primitives
4. lobby screens
5. game screens

### Recommendation

Keep the backend migration and the full visual redesign in separate PR streams. They touch different risk areas and are easier to verify independently.

## Suggested PR Sequence

-   `chore/baseline-runtime-cleanup`
-   `refactor/shared-contracts`
-   `refactor/domain-ports`
-   `feat/cloudflare-worker-scaffold`
-   `feat/cloudflare-auth-presence`
-   `feat/cloudflare-lobby-lifecycle`
-   `feat/cloudflare-tictactoe`
-   `feat/cloudflare-scheduler`
-   `feat/cloudflare-r2-uploads`
-   `feat/cloudflare-clicker`
-   `feat/cloudflare-jeopardy-assets`
-   `chore/remove-legacy-uws`

## Risks To Watch

-   migrating Jeopardy too early
-   coupling D1 into high-frequency game updates
-   mixing UI redesign and backend cutover in the same PRs
-   keeping domain rules coupled to transport details
-   assuming local dev behavior will match Durable Object production behavior without explicit tests

## Immediate Next Step

Start with a small prep branch that does only this:

-   clean `next.config.js`
-   stabilize runtime versions
-   introduce `shared/contracts`
-   introduce `shared/domain` with the first transport ports

That gives the project a migration spine without committing to the full backend cutover yet.
