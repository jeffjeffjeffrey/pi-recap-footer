# pi-recap-footer

Every assistant response ends with a recap footer:

```
🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌

_`You asked how to view GitHub versions of Meteorite PRs and add reviewers.`_

- `PR` [repo#7697](https://github.com/example/repo/pull/7697) — Trim normalization.
- `Issue` [repo#412](https://github.com/example/repo/issues/412) — Flaky checkout test on CI.

`Thu Aug 6, 2026 · 4:47 PM EDT` _(worked for 3m 24s)_
```

Built for running **many agent sessions in parallel** and reading the answers
cold — sometimes months later. The footer answers "what did I ask, when, and
what can I click?" without scrolling up.

## What it does

**1. The footer itself.** A `<recap-footer-context>` block is injected at the
start of every turn with four values the model uses verbatim: the request
timestamp, the request text, the session's theme, and a ready-to-paste rule
line. It is `display: false`, so the first visible appearance of the footer is
the final response — no tool call, no spoiler in the transcript.

**2. Session naming, for free.** The footer's summary line is already a one-line
past-tense description of the request, so it is reused as the session name via
`setSessionName()`. Unlike LLM-based session namers, this costs **no extra model
call** — the summary has already been written. `mode: "first"` freezes on the
opening summary ("why this session started") and never clobbers a name you set
with `/name`.

**3. Transcript timestamps (opt-in).** Dim rows after each tool execution and
assistant turn, so scrolling back tells you *when* things happened. Durable
session entries (`appendEntry` + `registerEntryRenderer`), not `ui.notify`
calls: they survive scrollback and resume, and never enter the model's context.

**Off by default.** The footer already ends every response with the request
timestamp, so an `assistant` row renders the same time a second time directly
beneath it. Turn on `timestamps.tools` if you want to see when each tool ran —
that is information the footer genuinely does not carry.

## The timestamp

By default (`timestamp.mode: "render"`) it is **when the answer landed**, with
how long the turn took — measured from your submit to the message finalising:

```
`Thu Aug 6, 2026 · 4:47 PM EDT` _(worked for 3m 24s)_
```

The model cannot know either value while it is writing, so the extension
rewrites the line at `message_end` — once, persistently. Not in the markdown
transformer: that re-runs on every terminal resize, which would make "now" jump
each time you changed the window size.

Set `timestamp.mode: "ask"` to keep the original behaviour instead — the time
**the request was sent**, read from the pi session JSONL, which records a true
ISO timestamp for every user message. Resume a session six months later and it
still says when you actually asked. Either way it is local time, never UTC,
never relative.

## Why the theme is stable

`sha256(session_id) % 35` picks one of 35 themes. A conversation keeps one
visual identity for its whole life — across compaction, context loss, and resume
— with **no stored state**. With a handful of windows open, occasional
collisions are expected.

Every glyph avoids U+FE0F variation selectors, ZWJ sequences, and text-default
presentation, so rows never render ragged. `trains` re-randomizes its cars on
every render.

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

Run `/footer-themes` to preview the catalog, `/footer-stamp` to see the current
session's values.

## Install

```bash
pi install git:github.com/<you>/pi-recap-footer
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
  "timestamp": {
    "mode": "render",      // "render" = when the answer landed; "ask" = when you sent it
    "showDuration": true   // append _(worked for 3m 24s)_
  },
  "theme": null,           // pin one theme instead of deriving it per session
  "sessionName": {
    "enabled": true,
    "mode": "first",       // "first" freezes on the opening summary; "latest" tracks
    "maxLength": 72
  },
  "timestamps": {          // all off by default; `assistant` duplicates the footer stamp
    "tools": false,
    "assistant": false,
    "user": false,
    "format": { "month": "short", "day": "numeric", "hour": "numeric", "minute": "2-digit" }
  }
}
```

Every part is independent — turn off `sessionName` and `timestamps` and you have
just the footer, or turn off the footer rule and keep the timestamps.

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

## Prior art

The pi ecosystem has adjacent things worth knowing about, none of which do this:

- [`pi-message-timestamps`](https://www.npmjs.com/package/pi-message-timestamps),
  [`@narumitw/pi-stamp`](https://www.npmjs.com/package/@narumitw/pi-stamp),
  [`@yusukeshib/pi-datetime`](https://www.npmjs.com/package/@yusukeshib/pi-datetime)
  — transcript timestamps, all TUI-only.
- [`pi-session-summary`](https://www.npmjs.com/package/pi-session-summary),
  [`@tmustier/pi-session-recap`](https://www.npmjs.com/package/@tmustier/pi-session-recap)
  — session summaries, generated with an extra model call.
- The various `pi-footer` / statusline packages — those are the TUI status bar
  below the editor, not text in the response.

The difference here is that the footer is **in the message body**, so it
survives copy-paste, `-p` print mode, RPC, and sharing a transcript.

## License

MIT
