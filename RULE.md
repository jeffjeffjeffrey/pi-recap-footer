# Every response ends with a recap footer (hard rule)

You are talking to someone who runs **many agent sessions in parallel** and often
reads a response long after they sent the request — sometimes minutes later,
sometimes after a weekend or months. By the time the final answer lands, they
usually no longer remember what they asked or when. So **every** response ends
with a recap footer.

**Always. Every response.** Status updates, one-line answers, long writeups,
error reports, questions back to the user — all of them. It is the *last* thing
in the message, after everything else. No footer = incomplete response.

## Getting the data

A `<recap-footer-context>` block is supplied to you automatically at the start of
each turn. It contains four tab-separated lines:

| Line | Use |
|------|-----|
| `stamp` | True timestamp of the latest request, read from the pi session log — correct even when a session is resumed months later. Use verbatim. |
| `ask` | First 300 chars of that request, for reference. |
| `theme` | This session's emoji theme, derived from `sha256(session_id)`. Stable for the life of the conversation, including across compaction and resume. |
| `rule` | The ready-to-paste rule line. Paste verbatim — including backticks if present. |

Keep that block and its retrieval out of reasoning, status updates, and tool
calls. Its first visible appearance must be the final footer.

## Shape

```markdown
<rule line, pasted verbatim from `rule`>

_`One-line past-tense summary of what was asked, with enough project context to re-orient.`_

- `PR` [ml-taxonomy#7697](https://github.com/Shopify/ml-taxonomy/pull/7697) — Trim normalization in taxonomy import.
- `Run` [oasis 019d4fff](https://oasis.shopify.io/runs/019d4fff546f1f651c23) — v3 embedding eval sweep.

`Wed Aug 5, 2026 · 4:16 PM EDT`
```

Blank line between the rule and the summary, and between the summary and the
links. The whole block is separated from the body by the rule line only — no
`---`, no heading, no emoji anywhere except the rule itself.

## The summary line

- **Always a summary, never a verbatim quote.** One line, past tense, normal
  sentence capitalization, ending in a period.
- Written to re-orient a cold reader: name the project or artifact when it isn't
  obvious, since they may be returning after months away.
- Phrase it however fits what the message actually was — asked, wanted, told you
  to, pushed back on, flagged. Don't force "You asked" onto a command or a
  clarification.
- Wrap it as `` _`...`_ `` — italic + `mdCode` teal, non-bold. If the summary must
  contain a backtick, drop the code span and use plain `_italics_`.
- Never expand it into a summary of your own work. It describes the request only.

This line is also what names the session, so it should read well on its own in a
session list.

## The link list

Include every linkable artifact in play in the thread — not only ones touched in
this turn. Carry the thread's primary artifact forward on every response. Omit
the list entirely when nothing linkable exists.

- Format: `` - `Type` [short-label](url) — Description. ``
- `Type` in a code span, normal capitalization: `PR`, `Issue`, `Run`, `Commit`,
  `CI`, `Doc`, `Site`, `File`.
- Short readable label: `ml-taxonomy#7697`, `oasis 019d4fff`, `buildkite #4821`.
- Description in normal capitalization ending with a period: the PR/issue title
  (truncate around 45 chars), what a run was attempting, why a doc matters.
- Most relevant first, cap around 5, then `+N more`.
- Clickable markdown always — never a bare number, ID, or name.

## The timestamp

Last line, on its own, from `stamp`, wrapped in a plain code span so it renders
teal and non-italic: `` `Wed Aug 5, 2026 · 4:16 PM EDT` ``. It is when **the
request was sent**, not "now" — never UTC, never relative.

If the stamp is marked `(approx: no session timestamp)`, keep that marker.
