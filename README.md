# pi-recap-footer

Every assistant response ends with a recap footer:

```
🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌

_`You asked how to view GitHub versions of Meteorite PRs and add reviewers.`_

- `PR` [ml-taxonomy#7697](https://github.com/Shopify/ml-taxonomy/pull/7697) — Trim normalization.
- `Run` [oasis 019d4fff](https://oasis.shopify.io/runs/019d4fff546f1f651c23) — v3 eval sweep.

`Thu Aug 6, 2026 · 4:47 PM EDT`
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

**3. Transcript timestamps.** Dim rows after each tool execution and assistant
turn, so scrolling back tells you *when* things happened. These are durable
session entries (`appendEntry` + `registerEntryRenderer`), not `ui.notify`
calls: they survive scrollback and resume, and never enter the model's context.

## Why the timestamp is trustworthy

It is the time **the request was sent**, read from the pi session JSONL — which
records a true ISO timestamp for every user message. Resume a session six months
later and the footer still says when you actually asked. It is not render time
and it is never UTC.

## Why the theme is stable

`sha256(session_id) % 35` picks one of 35 themes. A conversation keeps one
visual identity for its whole life — across compaction, context loss, and resume
— with **no stored state**. With a handful of windows open, occasional
collisions are expected.

Every glyph avoids U+FE0F variation selectors, ZWJ sequences, and text-default
presentation, so rows never render ragged. Emoji rules are 40 glyphs (~80
columns, matching pi's `<hr>`); text waves are 80 characters. `trains`
re-randomizes its cars on every render.

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
  "theme": null,           // pin one theme instead of deriving it per session
  "sessionName": {
    "enabled": true,
    "mode": "first",       // "first" freezes on the opening summary; "latest" tracks
    "maxLength": 72
  },
  "timestamps": {
    "tools": true,
    "assistant": true,
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
