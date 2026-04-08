# SIQ CLI

Small repo-local CLI for drafting and building Jeopardy `.siq` packs.

## Commands

From the repo root:

```bash
yarn siq boilerplate my_pack
yarn siq build my_pack
```

## Folder Format

Top level:

- each direct subfolder is a round
- the last round folder is treated as the final round
- optional `pack.json` controls pack name/author/difficulty
- underscore-prefixed folders and files are ignored

Round level:

- each subfolder is a theme

Question level:

- each subfolder is a question
- for normal rounds the folder name is the question price, for example `100`
- for the final round each theme must contain exactly one question folder

Question files:

- `type.txt`: question type, for example `simple`, `stake`, `secret`, `stakeAll`
- `1.txt`, `2.jpg`, `3.mp4`: question atoms before the buzz, ordered numerically
- `answer.txt`, `answer2.html`: answer atoms shown after the buzz, ordered as `answer`, `answer2`, `answer3`, ...
- `accepted.txt`: accepted answers, one per line
- `wrong.txt`: optional incorrect answers, one per line

## Atom Type Detection

- `.txt`, `.md` -> text
- `.html`, `.htm` -> html
- image extensions -> image
- audio extensions -> voice
- video extensions -> video
