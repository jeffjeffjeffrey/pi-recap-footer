# pi-recap-footer

Every assistant response ends with a recap footer:

```
🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌

_`You asked how to normalize unit strings in the taxonomy importer.`_

- `PR` [repo#7697](https://github.com/example/repo/pull/7697) — Trim normalization.
- `Issue` [repo#412](https://github.com/example/repo/issues/412) — Flaky checkout test on CI.

`Thu Aug 6, 2026 · 4:47 PM EDT` _(worked for 3m 24s)_
```

Built for running **many agent sessions in parallel** and reading the answers
cold — sometimes months later. The footer answers "what did I ask, when, and
what can I click?" without scrolling up.

## What it does

A `<recap-footer-context>` block is injected at the start of every turn with
four values the model uses verbatim: a formatted timestamp, the request text,
the session's theme, and a ready-to-paste rule line. It is `display: false`, so
the first visible appearance of the footer is the final response — no tool call,
no spoiler in the transcript.

That is the whole extension. It supplies the data; [`RULE.md`](RULE.md) tells
the model what to do with it.

## The timestamp

**When the answer landed**, with how long the turn took — measured from your
submit to the message finalising:

```
`Thu Aug 6, 2026 · 4:47 PM EDT` _(worked for 3m 24s)_
```

One meaning, nothing to configure. Local time, never UTC, never relative.

The model cannot know either value while it is writing, so the extension
rewrites the line at `message_end` — once, persistently. Not in the markdown
transformer: that re-runs on every terminal resize, which would make "now" jump
each time you changed the window size.

The stamp handed to the model is the *request* time, read from the pi session
JSONL. You normally never see it, since the rewrite replaces it — it is the
fallback for harnesses where the extension is not running, and it keeps the line
correct (if duration-less) in a session resumed months later.

## Why the theme is stable

`sha256(session_id) % 35` picks one of 35 themes. A conversation keeps one
visual identity for its whole life — across compaction, context loss, and resume
— with **no stored state**. With a handful of windows open, occasional
collisions are expected.

Every glyph avoids U+FE0F variation selectors, ZWJ sequences, and text-default
presentation, so rows never render ragged. `trains` re-randomizes its cars on
every render.

## Changing the rule

If two windows end up with the same rule, run `/footer-shuffle` in one of them.
It picks a different rule and keeps it for the rest of the session, including
after a resume.

## Full-width rules

With `fillWidth` (default on), the rule stretches to fill the terminal and
**re-flows when you resize the window**, via `registerMarkdownTransformer`.

This is display-only. The stored message and the model's context keep the
canonical row — 40 double-width emoji, or 80 text cells — so copy-paste, `-p`
output, RPC, and shared transcripts stay portable at 80 columns.

Rule rows inside fenced code blocks are deliberately left alone: docs and
transcripts routinely quote a rule as an example, and stretching those would
corrupt the thing being shown. Rows are identified by rebuilding each candidate
line at its observed length and comparing — set membership would be ambiguous,
since themes share glyphs (`🌭` is in both `hotdogs` and `junkfood`).

## Commands

| Command | |
|---|---|
| `/footer-shuffle` | Give this session a different rule. |
| `/footer-themes [filter]` | Preview the theme catalog. |
| `/footer-stamp` | Show this session's stamp, theme and rule. |

## Install

```bash
pi install npm:pi-recap-footer
# or straight from source
pi install git:github.com/jeffjeffjeffrey/pi-recap-footer
```

Then either set `injectRule: true` (below) or paste [`RULE.md`](RULE.md) into
your `AGENTS.md`. The extension supplies the *data*; the rule tells the model to
use it. Without one of the two you get metadata nobody reads.

## Configuration

`~/.pi/agent/recap-footer.json`, or `.pi/recap-footer.json` in a trusted
project (layered on top).

```jsonc
{
  "injectRule": false,     // append RULE.md to the system prompt.
                           // leave false if RULE.md is already in your AGENTS.md
  "timeZone": "system",    // or an IANA zone, e.g. "America/New_York"
  "fillWidth": true,       // stretch the rule to the terminal width, reflowing on resize
  "theme": null            // pin one theme instead of deriving it per session
}
```

That is the entire surface. Nothing about the footer's content is configurable
from here — that is `RULE.md`'s job, and it is a text file you can edit.

## A simpler footer

`RULE.md` is the spec, and it is meant to be edited. The emoji rule, the link
list, and the summary line are separable — delete the sections you don't want.
The extension only supplies `stamp`, `ask`, `theme`, and `rule`; what the model
does with them is entirely the rule's business.

## Tests

```bash
node test/parity.mjs
```

`test/fixture.json` is generated from the original python `ask-stamp`. The tests
assert the theme catalog, the sha256 selection, and every rule line still match
it byte for byte — otherwise an upgrade would silently change the visual
identity of every existing session.

The suite imports the `.ts` sources through the same jiti loader pi uses, and
jiti ships inside pi rather than being a dependency here. `test/jiti.mjs` finds
it at run time — a local install, `~/.pi/pkg/pi-*` newest-first, or the pi that
this repo's peer deps are symlinked to — so a pi upgrade cannot strand the
tests. `PI_JITI=/path/to/jiti.mjs` overrides the search.

## Prior art

The pi ecosystem has adjacent things worth knowing about, none of which do this:

- [`pi-message-timestamps`](https://www.npmjs.com/package/pi-message-timestamps),
  [`@narumitw/pi-stamp`](https://www.npmjs.com/package/@narumitw/pi-stamp),
  [`@yusukeshib/pi-datetime`](https://www.npmjs.com/package/@yusukeshib/pi-datetime)
  — transcript timestamps, all TUI-only.
- [`pi-session-summary`](https://www.npmjs.com/package/pi-session-summary),
  [`@tmustier/pi-session-recap`](https://www.npmjs.com/package/@tmustier/pi-session-recap)
  — session summaries and session naming, generated with an extra model call.
- The various `pi-footer` / statusline packages — those are the TUI status bar
  below the editor, not text in the response.

The difference here is that the footer is **in the message body**, so it
survives copy-paste, `-p` print mode, RPC, and sharing a transcript.

## License

MIT
