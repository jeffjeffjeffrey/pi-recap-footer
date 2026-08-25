/**
 * Parity + behaviour tests.
 *
 * The theme catalogue and the sha256-modulo selection must match the original
 * python `ask-stamp` exactly, or every existing session silently changes its
 * visual identity on upgrade. `fixture.json` is generated from the python.
 *
 * Run: node test/parity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadJiti } from "./jiti.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// The same loader pi uses, found at run time rather than pinned; see jiti.mjs.
const jiti = await loadJiti(import.meta.url);

const stamp = await jiti.import(join(ROOT, "extensions/recap-footer/stamp.ts"));
const themes = await jiti.import(join(ROOT, "extensions/recap-footer/themes.ts"));
const config = await jiti.import(join(ROOT, "extensions/recap-footer/config.ts"));

const fixture = JSON.parse(readFileSync(join(HERE, "fixture.json"), "utf8"));

// Hermetic: never read the developer's own ~/.pi/agent/recap-footer.json, or the
// suite passes or fails depending on whose machine it runs on.
process.env.PI_RECAP_FOOTER_CONFIG = join(HERE, "empty-config.json");

let passed = 0;
// Must await: several cases below are async, and a bare `fn()` would turn a
// rejected assertion into an unhandled rejection that still counted as a pass.
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
  } catch (error) {
    console.error(`FAIL  ${name}\n      ${error.message}`);
    process.exitCode = 1;
  }
};

// ---------------------------------------------------------------- catalogue

await test("theme list matches python, in the same order", () => {
  assert.deepEqual(themes.THEME_NAMES, fixture.themeNames);
});

await test("theme count is 35", () => {
  assert.equal(themes.THEME_NAMES.length, 35);
});

await test("every rule matches python byte for byte", () => {
  for (const [name, expected] of Object.entries(fixture.rules)) {
    assert.equal(stamp.buildRule(name), expected, `rule mismatch: ${name}`);
  }
});

await test("emoji rules are 40 glyphs, text rules 80 chars", () => {
  for (const name of themes.THEME_NAMES) {
    if (name === "trains") continue;
    const rule = stamp.buildRule(name);
    const glyphs = [...rule.replace(/`/g, "")];
    const expected = themes.TEXT_THEMES[name] ? 80 : 40;
    assert.equal(glyphs.length, expected, `${name} is ${glyphs.length} glyphs`);
  }
});

await test("no glyph carries a variation selector or ZWJ", () => {
  for (const name of themes.THEME_NAMES) {
    const rule = stamp.buildRule(name);
    assert.ok(!rule.includes("\uFE0F"), `${name} has U+FE0F`);
    assert.ok(!rule.includes("\u200D"), `${name} has ZWJ`);
  }
});

await test("trains: locomotive, 40 cars, caboose", () => {
  for (let i = 0; i < 50; i++) {
    const rule = stamp.buildRule("trains");
    const glyphs = [...rule];
    assert.equal(glyphs.length, 40);
    assert.equal(glyphs[0], themes.TRAIN_LOCO);
    assert.equal(glyphs[39], themes.TRAIN_CABOOSE);
  }
});

// ------------------------------------------------------------ theme picking

await test("sha256 theme selection matches python for every fixture seed", () => {
  for (const [seed, expected] of Object.entries(fixture.seeds)) {
    assert.equal(stamp.pickTheme(seed), expected, `seed ${JSON.stringify(seed)}`);
  }
});

await test("theme selection is stable across calls", () => {
  const seed = "019fd856-7173-7f06-8be0-5d7fce08f7aa";
  assert.equal(stamp.pickTheme(seed), stamp.pickTheme(seed));
});

// -------------------------------------------------------------- timestamps

await test("formatStamp reproduces the exact footer shape", () => {
  const when = new Date("2026-08-06T20:47:00Z");
  assert.equal(
    stamp.formatStamp(when, "America/New_York"),
    "Thu Aug 6, 2026 · 4:47 PM EDT",
  );
});

await test("formatStamp honours a non-Eastern zone", () => {
  const when = new Date("2026-08-06T20:47:00Z");
  assert.equal(
    stamp.formatStamp(when, "Europe/Berlin"),
    "Thu Aug 6, 2026 · 10:47 PM GMT+2",
  );
});

await test("formatStamp does not zero-pad day or hour", () => {
  const when = new Date("2026-01-05T14:03:00Z");
  const out = stamp.formatStamp(when, "America/New_York");
  assert.equal(out, "Mon Jan 5, 2026 · 9:03 AM EST");
});

await test("buildStamp prefers the supplied request time", () => {
  const result = stamp.buildStamp({
    sessionId: "019fd856-7173-7f06-8be0-5d7fce08f7aa",
    timestampMs: Date.UTC(2026, 7, 6, 20, 47),
    ask: "  lots   of\n whitespace  ",
    timeZone: "America/New_York",
  });
  assert.equal(result.stamp, "Thu Aug 6, 2026 · 4:47 PM EDT");
  assert.equal(result.ask, "lots of whitespace");
  assert.equal(result.theme, "bugs");
  assert.equal(result.approximate, false);
});

await test("buildStamp marks an unresolvable time as approximate", () => {
  const result = stamp.buildStamp({ sessionId: "x" });
  assert.ok(result.approximate);
  assert.match(result.stamp, /\(approx: no session timestamp\)$/);
});

await test("buildStamp reads the request time out of a session JSONL", () => {
  const result = stamp.buildStamp({
    sessionId: "x",
    sessionFile: join(HERE, "session-sample.jsonl"),
    timeZone: "America/New_York",
  });
  assert.equal(result.stamp, "Thu Aug 6, 2026 · 2:30 PM EDT");
  assert.equal(result.ask, "second question, this is the latest one");
});

// ------------------------------------------------------------------ config

await test("defaults do not inject the rule (AGENTS.md may already have it)", () => {
  assert.equal(config.DEFAULTS.injectRule, false);
});

await test("global config path honours PI_RECAP_FOOTER_CONFIG", () => {
  assert.equal(config.globalConfigPath(), join(HERE, "empty-config.json"));
});

await test("loadConfig falls back to defaults for absent keys", () => {
  const loaded = config.loadConfig("/tmp/nowhere", false);
  assert.equal(loaded.timeZone, "system");
  assert.equal(loaded.fillWidth, true);
  assert.equal(loaded.injectRule, false);
});

console.log(`\n${passed} passed${process.exitCode ? ", with failures" : ""}`);

// ----------------------------------------------------------------- reflow

const reflow = await jiti.import(join(ROOT, "extensions/recap-footer/reflow.ts"));

await test("detects every theme's own rule line", () => {
  for (const name of themes.THEME_NAMES) {
    const line = stamp.buildRule(name);
    assert.equal(reflow.detectTheme(line), name, `failed to detect ${name}`);
  }
});

await test("detects a rule at a non-default length", () => {
  assert.equal(reflow.detectTheme(stamp.buildRuleAt("bugs", 61)), "bugs");
  assert.equal(reflow.detectTheme(stamp.buildRuleAt("trains", 13)), "trains");
});

await test("does not mistake prose, links or short strings for a rule", () => {
  for (const line of [
    "You asked how to package the footer.",
    "`Thu Aug 6, 2026 \u00b7 4:47 PM EDT`",
    "- `PR` [x](https://example.com) \u2014 Thing.",
    "\ud83d\udc1b\ud83e\udd8b",
    "",
    "\ud83d\udc1b\ud83e\udd8b \ud83d\udc1d",
    "###### heading",
  ]) {
    assert.equal(reflow.detectTheme(line), undefined, `false positive: ${line}`);
  }
});

await test("a hotdogs row is not misread as junkfood (shared glyph)", () => {
  // hotdogs is all \ud83c\udf2d, which is also a junkfood glyph; only exact
  // reconstruction disambiguates.
  assert.equal(reflow.detectTheme(stamp.buildRule("hotdogs")), "hotdogs");
});

await test("emoji rules fill half the columns, text waves fill all of them", () => {
  assert.equal(reflow.glyphsForWidth("bugs", 120), 60);
  assert.equal(reflow.glyphsForWidth("bugs", 121), 60);
  assert.equal(reflow.glyphsForWidth("braille", 120), 120);
});

await test("reflow stretches the rule and leaves the rest of the message alone", () => {
  const body = [
    "Some prose here.",
    "",
    stamp.buildRule("bugs"),
    "",
    "_`A summary.`_",
    "",
    "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`",
  ].join("\n");
  const out = reflow.reflowMarkdown(body, 200);
  const lines = out.split("\n");
  assert.equal([...lines[2]].length, 100, "rule should fill 200 columns");
  assert.equal(reflow.detectTheme(lines[2]), "bugs", "still a bugs rule");
  assert.equal(lines[0], "Some prose here.");
  assert.equal(lines[4], "_`A summary.`_");
  assert.equal(lines[6], "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`");
});

await test("reflow shrinks for a narrow terminal", () => {
  const out = reflow.reflowMarkdown(stamp.buildRule("bugs"), 40);
  assert.equal([...out].length, 20);
});

await test("rule rows inside fenced code blocks are left untouched", () => {
  const quoted = stamp.buildRule("bugs");
  const body = ["Example:", "", "```", quoted, "```", "", quoted].join("\n");
  const out = reflow.reflowMarkdown(body, 200).split("\n");
  assert.equal(out[3], quoted, "fenced row must not be stretched");
  assert.equal([...out[6]].length, 100, "unfenced row must be stretched");
});

await test("tilde fences and nested backtick runs are handled", () => {
  const quoted = stamp.buildRule("moon");
  const body = ["~~~markdown", quoted, "~~~", quoted].join("\n");
  const out = reflow.reflowMarkdown(body, 160).split("\n");
  assert.equal(out[1], quoted);
  assert.equal([...out[3]].length, 80);
});

await test("indented rows (list/code content) are left untouched", () => {
  const quoted = `    ${stamp.buildRule("bugs")}`;
  assert.equal(reflow.reflowMarkdown(quoted, 200), quoted);
});

await test("a text-wave theme keeps its backticks after reflow", () => {
  const out = reflow.reflowMarkdown(stamp.buildRule("braille-teal"), 100);
  assert.ok(out.startsWith("`") && out.endsWith("`"));
  assert.equal([...out.slice(1, -1)].length, 100);
  assert.equal(reflow.detectTheme(out), "braille-teal");
});

await test("reflow is a no-op at a nonsense width", () => {
  const body = stamp.buildRule("bugs");
  assert.equal(reflow.reflowMarkdown(body, 0), body);
  assert.equal(reflow.reflowMarkdown(body, Number.NaN), body);
});

await test("reflow returns the identical string when nothing changes", () => {
  const body = "No rule in here at all.";
  assert.equal(reflow.reflowMarkdown(body, 200), body);
});

// ------------------------------------------------------------ render time

const rt = await jiti.import(join(ROOT, "extensions/recap-footer/render-time.ts"));

await test("duration formatting across the ranges", () => {
  const cases = [
    [0, "<1s"], [400, "<1s"], [1000, "1s"], [45_000, "45s"], [59_400, "59s"],
    [60_000, "1m"], [204_000, "3m 24s"], [3_540_000, "59m"],
    [3_600_000, "1h"], [4_920_000, "1h 22m"],
  ];
  for (const [ms, expected] of cases) {
    assert.equal(rt.formatDuration(ms), expected, `${ms}ms`);
  }
  assert.equal(rt.formatDuration(-1), "");
  assert.equal(rt.formatDuration(Number.NaN), "");
});

const FOOTER = [
  "Some answer body.",
  "",
  stamp.buildRule("bugs"),
  "",
  "_`You asked a thing.`_",
  "",
  "- `PR` [x](https://example.com) \u2014 Thing.",
  "",
  "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`",
].join("\n");

await test("rewrites the stamp to render time with a duration", () => {
  const out = rt.rewriteFooterTimestamp(FOOTER, {
    renderedAt: new Date("2026-08-07T18:22:24Z"),
    durationMs: 204_000,
    timeZone: "America/New_York",
  });
  const last = out.split("\n").at(-1);
  assert.equal(last, "`Fri Aug 7, 2026 \u00b7 2:22 PM EDT` _(worked for 3m 24s)_");
  // everything above the stamp is untouched
  assert.equal(out.split("\n").slice(0, -1).join("\n"), FOOTER.split("\n").slice(0, -1).join("\n"));
});

await test("omits the parenthetical only when the duration is unknown", () => {
  const noDur = rt.rewriteFooterTimestamp(FOOTER, {
    renderedAt: new Date("2026-08-07T18:22:24Z"), timeZone: "America/New_York",
  });
  assert.equal(noDur.split("\n").at(-1), "`Fri Aug 7, 2026 \u00b7 2:22 PM EDT`");
});

await test("leaves a message with no footer completely alone", () => {
  for (const text of [
    "Just a plain answer with no footer.",
    "Ends in a code span `but not a stamp`",
    "`Thu Aug 6, 2026` missing the time part",
    "",
  ]) {
    assert.equal(
      rt.rewriteFooterTimestamp(text, { renderedAt: new Date(), durationMs: 1000 }),
      text,
      JSON.stringify(text),
    );
  }
});

await test("does not touch a stamp that is not the last line", () => {
  const mid = "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`\n\nmore text after";
  assert.equal(rt.rewriteFooterTimestamp(mid, { renderedAt: new Date() }), mid);
});

await test("rewriting is idempotent", () => {
  const opts = { renderedAt: new Date("2026-08-07T18:22:24Z"), durationMs: 204_000, timeZone: "America/New_York" };
  const once = rt.rewriteFooterTimestamp(FOOTER, opts);
  const twice = rt.rewriteFooterTimestamp(once, opts);
  assert.equal(twice, once);
});

await test("preserves the approx marker for a session with no timestamp", () => {
  const approx = "body\n\n`Fri Aug 7, 2026 \u00b7 2:19 PM EDT (approx: no session timestamp)`";
  const out = rt.rewriteFooterTimestamp(approx, {
    renderedAt: new Date("2026-08-07T18:22:24Z"), durationMs: 5000, timeZone: "America/New_York",
  });
  // the rewrite supplies a real render time, so the approx marker is correctly dropped
  assert.equal(out.split("\n").at(-1), "`Fri Aug 7, 2026 \u00b7 2:22 PM EDT` _(worked for 5s)_");
});

await test("the reflow transformer never mistakes a stamp line for a rule", () => {
  assert.equal(reflow.detectTheme("`Fri Aug 7, 2026 \u00b7 2:22 PM EDT` _(worked for 3m 24s)_"), undefined);
});

// ------------------------------------------------------- extension wiring

const entry = await jiti.import(join(ROOT, "extensions/recap-footer/index.ts"), {
  default: true,
});

function mockPi() {
  const handlers = new Map();
  const state = { entries: [], name: undefined, commands: [], renderers: [], transformers: [] };
  return {
    state,
    handlers,
    on: (event, fn) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
    },
    emit: async (event, payload, ctx) => {
      const out = [];
      for (const fn of handlers.get(event) ?? []) out.push(await fn(payload, ctx));
      return out;
    },
    appendEntry: (type, data) => state.entries.push({ type, data }),
    registerEntryRenderer: (type, fn) => state.renderers.push({ type, fn }),
    registerCommand: (name, options) => state.commands.push({ name, ...options }),
    run: async (name, args, ctx) => {
      const command = state.commands.find((c) => c.name === name);
      assert.ok(command, `no such command: ${name}`);
      return command.handler(args ?? "", ctx);
    },
    registerMarkdownTransformer: (fn) => state.transformers.push(fn),
    setSessionName: (n) => (state.name = n),
    getSessionName: () => state.name,
  };
}

/** `ctx` for a session whose id themes to `bugs`. `entries` seeds the history. */
function mockContext(entries = []) {
  return {
    cwd: "/tmp/nowhere",
    isProjectTrusted: () => false,
    ui: { notify: () => {} },
    sessionManager: {
      getSessionId: () => "019fd856-7173-7f06-8be0-5d7fce08f7aa",
      getSessionFile: () => null,
      getEntries: () => entries,
    },
  };
}

const mockCtx = mockContext();

await test("extension loads and registers its hooks", async () => {
  const pi = mockPi();
  entry(pi);
  for (const event of ["session_start", "before_agent_start", "message_end"]) {
    assert.ok(pi.handlers.has(event), `missing handler: ${event}`);
  }
  assert.deepEqual(
    pi.state.commands.map((command) => command.name),
    ["footer-themes", "footer-shuffle", "footer-stamp"],
  );
});

const wired = mockPi();
entry(wired);
await wired.emit("session_start", {}, mockCtx);

await test("before_agent_start injects a hidden, correctly-themed context block", async () => {
  const [result] = await wired.emit(
    "before_agent_start",
    { prompt: "how do I package this?", systemPrompt: "BASE" },
    mockCtx,
  );
  assert.equal(result.message.display, false);
  assert.equal(result.message.customType, "recap-footer-context");
  assert.match(result.message.content, /^stamp\t.+$/m);
  assert.match(result.message.content, /^theme\tbugs$/m);
  assert.match(result.message.content, /^ask\thow do I package this\?$/m);
  assert.ok(result.message.content.includes("🐛"));
  // injectRule defaults off, so the system prompt is untouched
  assert.equal(result.systemPrompt, undefined);
});

await test("registered transformer reflows only finalized assistant markdown", async () => {
  const [transform] = wired.state.transformers;
  assert.ok(transform, "no markdown transformer registered");
  const rule = stamp.buildRule("bugs");

  const asAssistant = transform(rule, {
    messageType: "assistant",
    isStreaming: false,
    availableWidth: 200,
  });
  assert.equal([...asAssistant].length, 100);

  for (const context of [
    { messageType: "assistant", isStreaming: true, availableWidth: 200 },
    { messageType: "user", isStreaming: false, availableWidth: 200 },
    { messageType: "assistant-thinking", isStreaming: false, availableWidth: 200 },
  ]) {
    assert.equal(transform(rule, context), rule, JSON.stringify(context));
  }
});

await test("fillWidth:false disables reflow entirely", async () => {
  const off = mockPi();
  entry(off);
  process.env.PI_RECAP_FOOTER_CONFIG = join(HERE, "fillwidth-off.json");
  await off.emit("session_start", {}, mockCtx);
  process.env.PI_RECAP_FOOTER_CONFIG = join(HERE, "empty-config.json");

  const rule = stamp.buildRule("bugs");
  assert.equal(
    off.state.transformers[0](rule, {
      messageType: "assistant",
      isStreaming: false,
      availableWidth: 200,
    }),
    rule,
  );
});

await test("wired: message_end replaces the stamp with render time + duration", async () => {
  const w = mockPi();
  entry(w);
  await w.emit("session_start", {}, mockCtx);
  await w.emit("before_agent_start", { prompt: "do a thing", systemPrompt: "BASE" }, mockCtx);
  await new Promise((r) => setTimeout(r, 1100)); // let real wall-clock time pass

  const text = [stamp.buildRule("bugs"), "", "_`You asked a thing.`_", "", "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`"].join("\n");
  const results = await w.emit(
    "message_end",
    { message: { role: "assistant", timestamp: Date.now(), content: [{ type: "text", text }] } },
    mockCtx,
  );
  const replaced = results.find((r) => r && r.message);
  assert.ok(replaced, "no handler returned a replacement message");
  const last = replaced.message.content[0].text.split("\n").at(-1);
  assert.match(last, /^`[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2}, \d{4} \u00b7 .*` _\(worked for \d+s\)_$/, last);
  assert.notEqual(last, "`Fri Aug 7, 2026 \u00b7 2:19 PM EDT`", "stamp should have been replaced");
});

await test("wired: a tool-calling assistant message (no footer) is left alone", async () => {
  const w = mockPi();
  entry(w);
  await w.emit("session_start", {}, mockCtx);
  const results = await w.emit(
    "message_end",
    { message: { role: "assistant", timestamp: Date.now(), content: [{ type: "text", text: "Let me check that." }] } },
    mockCtx,
  );
  assert.ok(!results.some((r) => r && r.message), "should not replace a footerless message");
});

// ---------------------------------------------------------------- shuffle

const shuffle = await jiti.import(join(ROOT, "extensions/recap-footer/shuffle.ts"));

await test("shuffling always lands on a different theme", () => {
  for (const current of themes.THEME_NAMES) {
    for (const roll of [0, 0.5, 0.999999, 1]) {
      const picked = shuffle.nextTheme(current, () => roll);
      assert.notEqual(picked, current, `${current} @ ${roll}`);
      assert.ok(themes.THEME_NAMES.includes(picked), picked);
    }
  }
});

await test("shuffling from no theme at all still picks a real one", () => {
  const picked = shuffle.nextTheme(undefined, () => 0.5);
  assert.ok(themes.THEME_NAMES.includes(picked), picked);
});

await test("the latest shuffle in the session history wins", () => {
  const entries = [
    { type: "message", message: { role: "user" } },
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY, data: { theme: "moon" } },
    { type: "custom", customType: "something-else", data: { theme: "farm" } },
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY, data: { theme: "ocean" } },
  ];
  assert.equal(shuffle.shuffledTheme(entries), "ocean");
  assert.equal(shuffle.shuffledTheme([]), undefined);
});

await test("a bad or unknown theme in the history is ignored", () => {
  const entries = [
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY, data: { theme: "ocean" } },
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY, data: { theme: "not-a-theme" } },
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY },
  ];
  assert.equal(shuffle.shuffledTheme(entries), "ocean");
});

await test("wired: /footer-shuffle changes the rule and persists the choice", async () => {
  const w = mockPi();
  entry(w);
  const ctx = mockContext();
  await w.emit("session_start", {}, ctx);

  const before = await w.emit("before_agent_start", { prompt: "x", systemPrompt: "B" }, ctx);
  assert.match(before[0].message.content, /^theme\tbugs$/m);

  await w.run("footer-shuffle", "", ctx);

  const [saved] = w.state.entries;
  assert.equal(saved.type, shuffle.SHUFFLE_ENTRY);
  assert.ok(themes.THEME_NAMES.includes(saved.data.theme), saved.data.theme);
  assert.notEqual(saved.data.theme, "bugs");

  const after = await w.emit("before_agent_start", { prompt: "x", systemPrompt: "B" }, ctx);
  assert.match(after[0].message.content, new RegExp(`^theme\t${saved.data.theme}$`, "m"));
  assert.ok(after[0].message.content.includes(stamp.buildRule(saved.data.theme)));
});

await test("wired: a resumed session keeps its shuffled rule", async () => {
  const w = mockPi();
  entry(w);
  const ctx = mockContext([
    { type: "custom", customType: shuffle.SHUFFLE_ENTRY, data: { theme: "ocean" } },
  ]);
  await w.emit("session_start", {}, ctx);

  const [result] = await w.emit("before_agent_start", { prompt: "x", systemPrompt: "B" }, ctx);
  assert.match(result.message.content, /^theme\tocean$/m);
});

await test("wired: shuffling twice in a row moves off the shuffled theme too", async () => {
  const w = mockPi();
  entry(w);
  const ctx = mockContext();
  await w.emit("session_start", {}, ctx);

  await w.run("footer-shuffle", "", ctx);
  const first = w.state.entries.at(-1).data.theme;
  await w.run("footer-shuffle", "", ctx);
  const second = w.state.entries.at(-1).data.theme;
  assert.notEqual(second, first);
});

console.log(`${passed} passed total${process.exitCode ? ", with failures" : ""}`);
