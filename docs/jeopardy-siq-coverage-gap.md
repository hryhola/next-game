# Jeopardy `.siq` Coverage Gap Analysis

## Goal

Identify what this repository still needs in order to cover SI-style Jeopardy pack scenarios, especially the scenarios that appear in real `.siq` packs.

## Short conclusion

Full `.siq` coverage cannot be reached by adding a few extra if-statements around the current frame flow.

The main missing piece is a SI-compatible question and round engine that understands:

- question types
- scripted question steps
- richer answer types
- final-round rules
- metadata and validation rules

Without that, the app will continue to play only the subset of packs that happen to look like simple legacy scenario questions.

## Comparison summary

| Area                   | SI reference behavior                                                         | Current implementation                              | Gap severity |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ------------ |
| Pack schema            | Legacy scenario packs and modern `params`/`script` packs                      | Legacy `scenario` only                              | critical     |
| Question types         | Built-in and custom scripted types                                            | Ignored                                             | critical     |
| Answer types           | text, select, number, point                                                   | text only                                           | critical     |
| Content model          | placements, durations, background/replic/screen, html                         | single linear atom stream                           | critical     |
| Normal chooser flow    | contestant chooser, showman arbitration when needed                           | master picks by default, master can always override | high         |
| Special question flows | secret, stake, no-risk, for-all, etc.                                         | not implemented                                     | critical     |
| Final round            | score-based theme deletion, hidden stakes, timed final answers, answer reveal | custom simplified final flow                        | critical     |
| Validation/appeals     | rich validation, answer deviations, appeals                                   | manual approve/decline only                         | high         |
| Metadata               | package/round/theme/question info surfaced                                    | mostly ignored                                      | medium       |
| End-game flow          | winner, after-stage, statistics, reviews                                      | simple winner frame                                 | medium       |
| Test coverage          | scenario tests exist in SI                                                    | no Jeopardy tests                                   | high         |

## What must be implemented

### 1. Build a real SI-compatible pack model

Current blocker:

- the runtime assumes every playable question is `question.scenario.atom`

Required work:

- parse and preserve question `type`
- parse and preserve question `params`
- parse and preserve question `script`
- parse question/round/theme/package `info`
- support modern content items, not only legacy atoms
- support both:
    - legacy `ygpackage3.x` / v4-style packs
    - `siq_5.xsd` packs

Why this is mandatory:

- script-only or params-driven questions will not play at all with the current parser
- the current code cannot even express most SI behaviors in memory

### 2. Implement SI question-type behavior

Current blocker:

- all non-final questions are forced through the same buzzer flow

Required built-in flows:

| SI question type       | What needs to exist here                              |
| ---------------------- | ----------------------------------------------------- |
| `simple`               | Standard buzzer question with SI timing/rules         |
| `stake` / `auction`    | Visible stake selection, then direct answer           |
| `stakeAll`             | Hidden/all-player stakes flow                         |
| `secret` / `cat`       | Transfer question to selected player                  |
| `secretPublicPrice`    | Price known before transfer                           |
| `secretNoQuestion`     | Accept without content playback                       |
| `noRisk` / `sponsored` | Wrong answer does not subtract                        |
| `forYourself`          | Current chooser answers directly with SI factor/rules |
| `forAll`               | All eligible players answer directly                  |
| custom script types    | Execute package-defined `script` steps                |

Why this is mandatory:

- the root sample pack already uses 24 special questions
- those questions currently play incorrectly even though the app can open the pack

### 3. Implement SI answer types

Current blocker:

- answer input is always free text

Required work:

- `text`
- `select`
    - display options
    - label options correctly
    - reveal correct option
- `number`
    - numeric input
    - acceptable deviation
- `point`
    - point selection UI
    - deviation handling

Why this is mandatory:

- SI scripts can set answer type independently of question type
- select/number/point are part of the SI engine contract

### 4. Replace linear atom playback with a question-step engine

Current blocker:

- playback is `before marker -> buzz -> after marker`

Required work:

- execute SI-like question steps:
    - `setAnswerType`
    - `setAnswerer`
    - `announcePrice`
    - `setPrice`
    - `setTheme`
    - `showContent`
    - `askAnswer`
    - `accept`
- support more than one answering mode
- allow content to appear in the right stage and placement

Why this is mandatory:

- SI behavior is step-driven, not marker-driven
- `marker` alone is not enough for modern packs or for special-question logic

### 5. Expand content support to SI-level fidelity

Current blocker:

- content is limited to text/image/voice/video in a single stream

Required work:

- support `audio` alias in addition to `voice`
- support `say` / showman replic content
- support `html`
- support placements:
    - `screen`
    - `replic`
    - `background`
- support item durations
- support `waitForFinish`
- support `isRef`
- support multi-item layouts and option layouts

Why this is mandatory:

- SI can show narration, background audio, answer-option layouts, and timed composite content
- newer packs rely on modern content items, not just legacy atoms

### 6. Fix classic Jeopardy chooser flow

Current blocker:

- master is effectively the default picker
- master can always override picker restrictions

Required work:

- separate showman/master control from contestant chooser logic
- choose first picker using SI-compatible rules
- hand chooser role to correct answering player
- reserve showman actions for arbitration, validation, and control

Why this matters:

- classic SI Jeopardy is contestant-driven in board selection
- the current master-first flow changes game behavior immediately from question one

### 7. Rebuild final round to match SI

Current blocker:

- final round is only a simplified custom flow

Required work:

- compute eligible final-round players from scores/rules
- implement SI-compatible theme deletion order
- allow showman tie resolution when the deletion order is ambiguous
- collect hidden stakes with timers
- run timed final-answer collection
- validate final answers one by one
- reveal right answer content
- apply stakes exactly as SI does
- ensure winner is selected among contestants, not the master placeholder
- support the `PlayAllQuestionsInFinalRound` style behavior if desired

Important current mismatches:

- `skipperId` comes from the previous picker, not from SI final ordering
- later skipping rotates by join order, not score-based order
- no timers for final betting or final answering
- no final answer reveal stage
- no automatic transition after final answer verification
- winner calculation can include the master

### 8. Implement SI-style validation support

Current blocker:

- the master only approves or declines a free-text answer

Required work:

- expose all right answers and wrong answers cleanly
- support numeric deviation checks
- support select-option checks
- support point-answer checks
- preserve AI/manual suggestion separation if wanted
- add appellations/appeals if parity with SI gameplay is required

Why this matters:

- SI packs often carry multiple acceptable answers and explicit wrong answers
- SI gameplay includes more than a binary text approval modal

### 9. Add metadata, round-end, and game-end parity

Current blocker:

- the runtime mostly shows gameplay-only frames

Required work:

- package metadata display
- round/theme/question comments and sources
- round end reasons:
    - empty
    - timeout
    - manual
- after-game stage
- statistics
- optional review flow if parity is desired

Why this matters:

- SI clients expose much more of the package metadata and lifecycle
- this is part of actual pack consumption, not just cosmetic detail

### 10. Add automated scenario tests

Current blocker:

- there are no Jeopardy-specific tests here

Required work:

- pack parser tests for legacy and v5 packs
- question-type behavior tests
- round-flow tests
- final-round tests
- regression tests against real sample packs in the repo

Suggested minimum regression fixtures:

- a plain `simple` question
- `auction`
- `cat`
- `bagcat`
- `sponsored`
- a `select` answer question
- a `number` answer question
- a scripted v5 question using `params` + `script`
- a final round with multiple eligible players and tied scores

## Priority order

### Phase 1: unblock pack correctness

- extend the pack model to include `type`, `params`, `script`, metadata
- support legacy and v5 schema variants
- preserve question behavior data instead of discarding it

### Phase 2: introduce an SI-style question engine

- implement step-driven playback
- support SI answerer/price/theme steps
- support answer types beyond text

### Phase 3: implement special question types

- `stake`
- `stakeAll`
- `secret`
- `secretPublicPrice`
- `secretNoQuestion`
- `noRisk`
- `forYourself`
- `forAll`

### Phase 4: rebuild final round

- score-driven theme deletion
- hidden stakes
- timed answers
- answer reveal
- proper winner computation

### Phase 5: metadata, appeals, polish, and tests

- metadata surfacing
- appellations if required
- parity sounds/messages
- automated scenario coverage

## Real-pack impact

Using the root `УберПак1.siq` as a concrete example:

- the app can load the pack and show most media atoms
- it cannot honor 24 special questions correctly
- it does not understand why those questions are special
- it does not implement SI’s secret-question, auction, bag-cat, or no-risk rules

So even for a real pack already present in this repository, the current implementation is only a partial player, not a faithful SI-compatible runtime.

## Bottom line

To fully cover SI `.siq` scenarios, this project needs:

- a broader pack parser
- a richer runtime state model
- an SI-like question engine
- SI-compatible special-question flows
- a proper final-round engine

The critical path is not UI polish. The critical path is moving from:

- "play a legacy scenario like a generic buzz question"

to:

- "execute SI pack semantics faithfully"
