# SI Jeopardy Reference

## Scope

This document describes what the `SI/` repository supports for Jeopardy-style play with `.siq` packs, with emphasis on:

- package structure and schema coverage
- round types, question types, answer types, and content/atom types
- the classic Jeopardy flow from game start to game end
- the scenarios that matter for pack compatibility

The comparison target for the gap analysis is the classic Jeopardy flow, not the other SI game modes.

## Sources inspected

- `SI/assets/siq_5.xsd`
- `SI/assets/ygpackage3.1.xsd`
- `SI/src/Common/SIPackages/Core/QuestionTypes.cs`
- `SI/src/Common/SIPackages/Core/RoundTypes.cs`
- `SI/src/Common/SIPackages/Core/ContentTypes.cs`
- `SI/src/Common/SIPackages/Core/AtomTypes.cs`
- `SI/src/Common/SIPackages/Core/QuestionParameterNames.cs`
- `SI/src/Common/SIPackages/Core/StepTypes.cs`
- `SI/src/Common/SIPackages/Core/StepParameterNames.cs`
- `SI/src/Common/SIPackages/Core/StepParameterValues.cs`
- `SI/src/Common/SIPackages/ScriptsLibrary.cs`
- `SI/src/Common/SIEngine/GameEngine.cs`
- `SI/src/Common/SIEngine/Rules/WellKnownGameRules.cs`
- `SI/src/Common/SIEngine/QuestionSelectionStrategies/RemoveOtherThemesStrategy.cs`
- `SI/src/Common/SIEngine.Core/QuestionEngine.cs`
- `SI/src/Common/SIEngine.Core/IQuestionEnginePlayHandler.cs`
- `SI/src/SICore/SICore/Clients/Game/PlayHandler.cs`
- `SI/src/SICore/SICore/Clients/Game/GameLogic.cs`
- `SI/src/SICore/SICore/Clients/Game/QuestionPlayHandler.cs`
- `SI/src/SICore/SICore/Clients/Game/ThemeDeletersEnumerator.cs`
- `SI/src/SICore/SICore/GAME_AGENT_DOCUMENTATION.md`
- `SI/test/SICore/SICore.Tests/Scenarios/ScenariosTests.cs`
- `SI/test/SICore/SICore.Tests/GameTests.cs`

## Pack model

### Schema generations

SI supports both older scenario-based packages and the newer script/params model.

Legacy package style:

- round/question metadata is mostly driven by `<type>` and `<scenario>`
- question content is an ordered list of `atom` nodes
- examples from real packs use legacy aliases like `auction`, `cat`, `bagcat`, `sponsored`

Modern package style in `siq_5.xsd`:

- question type can be stored as question attribute `type`
- question content can be expressed with:
    - `params`
    - `script`
    - legacy `scenario`
- question behavior can be fully scripted with steps such as:
    - `setAnswerType`
    - `setAnswerer`
    - `announcePrice`
    - `setPrice`
    - `setTheme`
    - `showContent`
    - `askAnswer`
    - `accept`

### Round types

Supported round types in SI:

| Round type            | Meaning                           |
| --------------------- | --------------------------------- |
| `standart` / `table`  | Normal Jeopardy board round       |
| `final` / `themeList` | Final round with removable themes |

### Question types

Built-in question types in SI:

| Question type       | Legacy alias | Main behavior                                                   |
| ------------------- | ------------ | --------------------------------------------------------------- |
| `simple`            | `withButton` | Standard button question                                        |
| `stake`             | `auction`    | Auction/stake question with visible bidding                     |
| `stakeAll`          | none         | Hidden stakes for all eligible answerers                        |
| `secret`            | `cat`        | Secret question transferred to a selected player                |
| `secretPublicPrice` | none         | Secret question where price is known before transfer            |
| `secretNoQuestion`  | none         | Secret question that awards points without playing content      |
| `noRisk`            | `sponsored`  | Wrong answer does not subtract points                           |
| `forYourself`       | none         | Current chooser answers directly, usually with multiplied price |
| `forAll`            | none         | All players answer directly                                     |
| custom script type  | none         | Question-defined script in package                              |

Important detail:

- SI does not only recognize names. It also has built-in scripts for those names in `ScriptsLibrary`.
- Custom scripted questions are possible even when they are not one of the built-ins.

### Answer types

SI question answering is richer than plain text.

| Answer type | Support in SI                                  |
| ----------- | ---------------------------------------------- |
| `text`      | Default free-text answer                       |
| `number`    | Numeric answer with allowed deviation          |
| `point`     | Point/coordinate answer with allowed deviation |
| `select`    | Multiple-choice answer options                 |

### Content and atom types

Legacy scenario atoms:

| Atom type | Meaning                                               |
| --------- | ----------------------------------------------------- |
| `text`    | Screen text                                           |
| `say`     | Showman speech / replic                               |
| `image`   | Image                                                 |
| `voice`   | Legacy audio                                          |
| `audio`   | New audio alias                                       |
| `video`   | Video                                                 |
| `marker`  | Separator between question content and answer content |
| `html`    | HTML fragment                                         |

Modern content items:

| Content type | Meaning |
| ------------ | ------- |
| `text`       | Text    |
| `image`      | Image   |
| `audio`      | Audio   |
| `video`      | Video   |
| `html`       | HTML    |

Modern content items also support:

- `placement`
    - `screen`
    - `replic`
    - `background`
- `isRef`
- `duration`
- `waitForFinish`

This matters because SI can play:

- screen and background media separately
- narration/replic independently from the main question content
- timed sequences with pauses
- multi-item screen layouts
- answer content that is itself media, not just plain text

### Package metadata and info objects

SI also models and can display:

- package authors, date, sources, comments, contact URI
- round authors, sources, comments
- theme comments
- question authors, sources, comments
- global authors/sources dictionaries

## Game modes

SI exposes several rule sets:

| Mode         | Default round behavior                 |
| ------------ | -------------------------------------- |
| `Classic`    | Player chooses questions from board    |
| `Sequential` | Questions are played in order          |
| `Quiz`       | Default question type becomes `forAll` |
| `TurnTaking` | Default question type becomes `noRisk` |

For classic Jeopardy:

- standard rounds use board selection
- final rounds use `RemoveOtherThemes`
- final round default question type becomes `stakeAll`

## Classic Jeopardy flow in SI

## 1. Before game

SI sends package and game metadata first:

- stage switches to begin/before-game
- package id and round names are announced
- package metadata can be shown
- all game themes may be shown up front
- player sums are initialized

Key point:

- the game has an explicit stage model, not just a single frame transition

## 2. Round start

For each round SI:

- switches to round stage
- publishes round metadata
- sends round theme names and comments
- reveals themes one by one
- builds the board/table

For normal rounds, question selection strategy is usually `SelectByPlayer`.

## 3. First chooser and board control

In classic play SI picks a contestant as chooser, not the showman.

Then the loop is:

- chooser is announced
- board is shown
- chooser selects a question
- selection is broadcast to everyone

After a correct answer, the answering player typically becomes the next chooser.

## 4. Normal question playback

Every question runs through the question engine:

1. Question start
2. Question type announcement
3. Optional question-specific theme/caption
4. Content playback
5. Ask-answer stage
6. Answer collection
7. Showman validation
8. Right answer display
9. Question end
10. Score update

The content portion can include:

- text
- image
- audio
- video
- HTML
- replic/background layers
- multiple visual items
- partial/timed reveals

## 5. Special question flows

### `simple`

- standard Jeopardy question
- usually button-based
- wrong answers can lock out or penalize depending on rules

### `stake` / `auction`

- auction/stake selection is requested
- current eligible player chooses stake in range
- highest stake or chosen stake becomes the question value
- answer is usually direct rather than buzzer-based

### `stakeAll`

- used for scenarios where all eligible answerers make hidden stakes
- multiple answerers can participate
- stakes are applied per player
- this is also the default final-round question type under classic rules

### `secret` / `cat`

- chooser transfers the question to another player
- question-specific theme can be announced
- selected player may need to choose price from a range

### `secretPublicPrice`

- same family as `secret`
- price becomes public before player transfer

### `secretNoQuestion`

- special transfer/price flow exists
- question ends via `accept` without content playback

### `noRisk` / `forYourself`

- current chooser answers directly
- wrong answer can have no penalty
- score multiplier/factor can be applied

### `forAll`

- all players answer directly
- showman validates collected answers

### scripted/custom questions

- packages can define exact step sequences
- the engine is driven by script steps, not only by question type name

## 6. Validation and appeals

SI includes answer validation support beyond a simple approve/decline:

- showman receives right and wrong answers
- multiple right answers are supported
- wrong-answer lists are supported
- numerical deviation is supported
- select-option validation is supported
- appellations/appeals can reopen a verdict

## 7. Round end

A round can end because:

- all questions are exhausted
- time ran out
- showman/manual action ended it

Then SI sends:

- timer stop
- round-end reason
- final round sums

## 8. Final round

Classic final-round behavior in SI is materially different from a normal round.

### Final themes

- final themes are shown together
- eligible players are determined from score and rules
- theme deletion order is score-dependent
- ties can require showman arbitration
- themes are deleted until one remains

If `PlayAllQuestionsInFinalRound` is enabled:

- the remove-other-themes process can repeat for the remaining themes

### Final stakes

- eligible players with positive scores participate
- each player makes a hidden stake
- stake amount is hidden from others until scoring

### Final question

- final question is played after stakes are collected
- final think timer starts
- players submit hidden answers
- showman validates answers one by one
- each stake is applied according to verdict
- right answer is displayed

## 9. Game end

SI then performs an explicit end-game flow:

- stop timers
- announce winner
- switch stage to after/finished
- publish game statistics
- optionally ask players for reviews

## Compatibility notes from a real pack in this repo

The root pack `УберПак1.siq` is a legacy package:

- schema namespace: `http://vladimirkhil.com/ygpackage3.0.xsd`
- package version: `4`
- rounds: `4`
- themes: `29`
- questions: `134`

Special question types found in that pack:

| Type        | Count |
| ----------- | ----- |
| `auction`   | 9     |
| `cat`       | 8     |
| `bagcat`    | 6     |
| `sponsored` | 1     |

Legacy atom usage found in that pack:

| Atom type | Count |
| --------- | ----- |
| `image`   | 78    |
| `marker`  | 58    |
| `video`   | 41    |
| `voice`   | 13    |

This is important because SI supports all of those constructs natively, while newer packs may additionally use the script/params model from `siq_5.xsd`.

## Bottom line

SI is not just a board viewer for scenario atoms. It is:

- a multi-stage Jeopardy engine
- a round-strategy engine
- a question-script engine
- a validation/appeals engine
- a final-round theme-deletion and hidden-stakes engine
- a richer package metadata and content model

Any implementation that wants full `.siq` coverage has to match both:

- legacy scenario/type packs
- modern scripted `params`/`script` packs
