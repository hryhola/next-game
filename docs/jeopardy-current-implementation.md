# Current Jeopardy Implementation

## Scope

This document describes the Jeopardy implementation that currently exists in this repository, based on the worker runtime and the Next.js client.

It focuses on:

- what pack structure is actually parsed
- what runtime flows are implemented
- what question/content concepts exist in code today
- where the current behavior materially differs from SI

## Sources inspected

- `workers/realtime/jeopardy/pack.ts`
- `workers/realtime/games/jeopardy/feature.ts`
- `workers/realtime/games/jeopardy/definition.ts`
- `workers/realtime/games/jeopardy/internal-types.ts`
- `workers/realtime/games/jeopardy/adapter.ts`
- `shared/contracts/jeopardy.ts`
- `shared/contracts/game-actions.ts`
- `shared/contracts/app.ts`
- `workers/realtime/index.ts`
- `workers/realtime/lobby/types.ts`
- `client/features/games/jeopardy/JeopardyView.tsx`
- `client/features/games/jeopardy/JeopardyCanvas.tsx`
- `client/features/games/jeopardy/JeopardyControls.tsx`
- `client/features/games/jeopardy/JeopardyPlayersHeader.tsx`
- `client/features/games/jeopardy/JeopardyPreSession.tsx`
- `client/features/games/jeopardy/JeopardySounds.tsx`
- `client/features/games/jeopardy/frames/JeopardyPackPreview.tsx`
- `client/features/games/jeopardy/frames/JeopardyRoundPreview.tsx`
- `client/features/games/jeopardy/frames/JeopardyQuestionBoard.tsx`
- `client/features/games/jeopardy/frames/JeopardyQuestionContent.tsx`
- `client/features/games/jeopardy/frames/JeopardyFinalRoundBoard.tsx`
- `client/features/games/jeopardy/frames/JeopardyFinalScore.tsx`
- `client/features/games/jeopardy/utils/jeopardyPackLoading.tsx`
- `client/features/games/common/PlayerMenu.tsx`

## Current pack model

### What is parsed

The worker loads `.siq` as a zip, opens `content.xml`, and parses it with `xml-js`.

Pack metadata currently used:

- package name
- top-level author
- package date
- rounds
- themes
- question prices
- legacy `scenario` atoms
- `right.answer`
- optional `wrong.answer`

### Hard-coded assumptions

The current type model is narrow.

The code assumes:

- there is a `content.xml`
- top-level author exists at `package.info.authors.author._text`
- round structure is `package.rounds.round`
- theme structure is `round.themes.theme`
- question structure is `theme.questions.question`
- playable question content comes from `question.scenario.atom`

The current `JeopardyDeclaration.Question` type does not model:

- question `type`
- question `params`
- question `script`
- question `info`

The current `JeopardyDeclaration.Round` type only models:

- default round
- `type === 'final'`

It does not model the `themeList` alias or SI round-rule variations.

### Supported content/atom types

The runtime recognizes these question-content atom types:

| Current atom type support            | Status                             |
| ------------------------------------ | ---------------------------------- |
| text atom with no `_attributes.type` | supported                          |
| `image`                              | supported                          |
| `voice`                              | supported                          |
| `video`                              | supported                          |
| `marker`                             | supported as question/answer split |

Everything else is outside the declared contract.

Notably absent from the current declared model:

- `say`
- `audio`
- `html`
- placements like `screen`, `replic`, `background`
- per-item `duration`
- `waitForFinish`
- `isRef`

### Supported question types

There is no first-class question-type implementation in the current runtime.

What exists today:

- normal round question flow
- final-round betting and final-answer flow

What does not exist as modeled question types:

- `simple`
- `stake` / `auction`
- `stakeAll`
- `secret` / `cat`
- `secretPublicPrice`
- `secretNoQuestion`
- `noRisk` / `sponsored`
- `forYourself`
- `forAll`
- custom scripted types

Question `type` data from packs is effectively ignored.

### Supported answer types

Only free-text entry is implemented.

Normal round:

- contestants buzz
- active contestant enters text
- master approves or declines

Final round:

- contestants submit free-text answers
- master approves or declines

Not implemented:

- select/multiple-choice answers
- numeric answers with deviation
- point/coordinate answers with deviation

## Roles and session model

The current Jeopardy session requires:

- the lobby creator as `master`
- at least one additional contestant
- a successful ready check before start

Important difference from SI:

- the master is represented inside the player list as a Jeopardy participant with score `0`
- the master cannot answer regular/final questions
- the winner calculation still scans all player-role members, including the master

## Current flow from start to finish

### 1. Lobby start

Before a session starts:

- master uploads a `.siq`
- pack is stored as an asset
- pack metadata is parsed server-side
- all players must be ready

### 2. Pack preview

When a game starts:

- session is created
- frame becomes `pack-preview`
- preview lasts `10_000ms`
- shown data:
    - pack name
    - author
    - creation date
    - shuffled non-final theme names

Differences from SI:

- this is a custom UI phase, not SI stage metadata
- themes are shuffled, not presented as SI `GAMETHEMES`
- no package comments/sources/round list are shown

### 3. Round preview

For each round:

- frame becomes `rounds-preview`
- round name shows for `2_000ms`
- each theme name shows for `2_000ms`

After preview:

- normal round -> `question-board`
- final round -> `final-round-board`

### 4. Question board flow

For non-final rounds the board shows:

- theme names
- question prices
- answered/unanswered state
- current picker

Picker behavior today:

- initial picker defaults to the master
- after an approved answer, picker becomes the answering contestant
- the master can still pick any question even when it is not their turn

Differences from SI:

- no explicit random first chooser among contestants
- no showman-only chooser arbitration flow
- no special chooser transfer logic for question types

### 5. Normal question flow

Current normal question flow is fully driven by legacy `scenario` atoms.

#### Before-answer atoms

`marker` splits the scenario into:

- `beforeAtoms`
- `afterAtoms`

If there is no `marker`, the runtime synthesizes `afterAtoms` from `right.answer`.

#### Atom playback

For each atom before the marker:

- text/image atoms auto-advance after `5_000ms`
- voice/video atoms wait for client media completion or a master skip

The current frame during playback is `question-content`.

#### Buzz window

After `beforeAtoms` finish:

- `answeringStatus` becomes `allowed`
- contestants get `5_000ms` to buzz

If a contestant presses early, late, or while unavailable:

- the server puts them on a `2_000ms` cooldown

#### Answer entry

When a contestant wins the buzz:

- `answeringStatus` becomes `answering`
- they get `10_000ms` to submit text
- their id is tracked in `playersWhoAnswered`

#### Verification

After answer submission or timeout:

- `answeringStatus` becomes `answer-verifying`
- the master gets `10_000ms` to approve/decline
- correct and wrong answers are shown to the master from pack data

Score change:

- approved: `+price`
- declined or verification timeout: `-price`

If approved:

- picker becomes the answering contestant
- question continues to answer reveal

If declined and answer-request time remains:

- the buzzer window resumes with the remaining time

If no time remains:

- question moves to after-marker atoms / answer reveal

#### Reveal and return to board

After answer resolution:

- `afterAtoms` are played
- if no `afterAtoms` exist, joined correct answers are shown as text
- question is marked answered
- if round still has unanswered questions, board is shown again
- otherwise the next round starts or final score is shown

### 6. Final round flow

The current final-round UI has four statuses:

- `skipping`
- `betting`
- `answering`
- `answer-verifying`

#### Theme skipping

When final round starts:

- all final themes are shown together
- `skipperId` starts as `session.internal.pickerId`
- master can always skip
- non-master can skip only on their turn
- players delete themes until one remains

Current order rule:

- first skipper is the current picker from normal play
- later skip turns rotate through contestants by join order

This is not SI score-based deletion order.

#### Betting

After one final theme remains:

- contestants with positive score can bet
- bet must be between `1` and current score
- no timer is enforced

#### Final answering

Current final answering behavior:

- only the chosen final question's `beforeAtoms` are shown
- all positive-score contestants can submit one free-text answer
- there is no timer
- answer content after the marker is not shown

#### Final verification

Master verifies answers manually:

- each answer gets `approved` or `declined`
- score delta is `+bet` or `-bet`
- there is no verification timer
- the flow does not auto-finish after all answers are rated
- master must explicitly trigger `$ShowFinalScores`

#### Final score frame

The game ends on a simple `final-score` frame:

- winner nickname
- optional avatar

There is no SI-style:

- right-answer reveal stage
- final question end stage
- winner message sequence
- after-stage transition
- game statistics
- review collection

## Current implemented feature inventory

### Gameplay features

Implemented:

- pack upload and pack preview
- round preview
- normal board question picking
- normal question atom playback
- image/audio/video playback from pack media folders
- buzz flow
- anti-spam cooldown for invalid buzzes
- manual answer verification by master
- score updates
- picker reassignment after correct answer
- final theme skipping
- final betting
- final answer submission
- final answer manual verification
- pause/resume
- master skip button for most phases
- master manual score editing

### UI features

Implemented:

- player header with highlighted active player
- pack media extraction in browser
- answer modal for active contestant
- verification modal for master
- final-round modal/slider for betting
- final-answer table for master

### Operational features

Implemented:

- scheduled task handling in Durable Object scheduler
- paused task restoration on resume
- finalized session persistence
- pack assets stored in worker-backed asset storage

## Known behavioral quirks in the current implementation

- special question types from the pack are ignored
- only legacy `scenario` content is used
- SI script/params questions are unsupported
- no select/number/point answer UI
- no metadata display for package/round/theme/question comments/sources/authors
- no SI-style round timeout/manual-end signaling
- final theme deletion order is not SI-compatible
- final betting/final answering/final verification have no timers
- final answer reveal content is not played
- master is part of the player list and can win if contestants fall below the master's score
- `JeopardySounds.tsx` listens for `$RoundPreview`, but the worker does not emit that action event
- there are no Jeopardy-specific automated tests in `workers/realtime`

## Real-pack compatibility snapshot

The root pack `УберПак1.siq` contains:

- 4 rounds
- 29 themes
- 134 questions
- 24 legacy special questions:
    - 9 `auction`
    - 8 `cat`
    - 6 `bagcat`
    - 1 `sponsored`

The current implementation can parse and display many of its media atoms, but those 24 special questions are still treated as ordinary questions because `question.type` is not implemented.

## Bottom line

The current implementation is a custom Jeopardy runtime that supports:

- legacy scenario playback
- one generic normal-question buzzer flow
- one custom final-round flow

It is not yet an SI-compatible `.siq` runtime.

The main reason is structural:

- SI is question-type and script driven
- the current implementation is frame driven and scenario-atom driven
