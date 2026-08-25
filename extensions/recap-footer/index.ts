import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { type RecapFooterConfig, DEFAULTS, loadConfig } from "./config.js";
import { registerReflow } from "./reflow.js";
import { registerRenderTime } from "./render-time.js";
import {
	type ShuffleEntry,
	nextTheme,
	SHUFFLE_ENTRY,
	shuffledTheme,
} from "./shuffle.js";
import { buildRule, buildStamp, collapse } from "./stamp.js";
import { THEME_NAMES } from "./themes.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const RULE_PATH = join(HERE, "..", "..", "RULE.md");

function readRule(): string | undefined {
	try {
		return readFileSync(RULE_PATH, "utf8").trim();
	} catch {
		return undefined;
	}
}

export default function recapFooter(pi: ExtensionAPI) {
	let config: RecapFooterConfig = DEFAULTS;
	const getConfig = () => config;
	/** Set by `/footer-shuffle`; outranks the config and the derived theme. */
	let shuffled: string | undefined;

	const themeFor = () => shuffled ?? config.theme;

	pi.on("session_start", (_event, ctx) => {
		config = loadConfig(ctx.cwd, ctx.isProjectTrusted());
		shuffled = shuffledTheme(ctx.sessionManager.getEntries());
	});

	/**
	 * Supplies footer metadata to the model without rendering a tool call or its
	 * emoji rule in the transcript. The final assistant response is the first
	 * visible appearance of the footer.
	 */
	pi.on("before_agent_start", (event, ctx) => {
		const stamp = buildStamp({
			sessionId: ctx.sessionManager.getSessionId(),
			sessionFile: ctx.sessionManager.getSessionFile() ?? undefined,
			timestampMs: Date.now(),
			ask: event.prompt,
			cwd: ctx.cwd,
			timeZone: config.timeZone,
			theme: themeFor(),
		});

		const lines = [
			`stamp\t${stamp.stamp}`,
			`ask\t${collapse(event.prompt)}`,
			`theme\t${stamp.theme}`,
			`rule\t${stamp.rule}`,
		].join("\n");

		const rule = config.injectRule ? readRule() : undefined;

		return {
			message: {
				customType: "recap-footer-context",
				content: `<recap-footer-context private="true">
Use these values for the mandatory recap footer. Keep this metadata and its retrieval completely out of reasoning, status updates, and tool calls; its first visible appearance must be in the final footer.
${lines}
</recap-footer-context>`,
				display: false,
			},
			...(rule ? { systemPrompt: `${event.systemPrompt}\n\n${rule}` } : {}),
		};
	});

	registerReflow(pi, getConfig);
	// Last, so any handler registered before it sees the text the model wrote
	// rather than the stamp-rewritten version.
	registerRenderTime(pi, getConfig);

	pi.registerCommand("footer-themes", {
		description: "Preview every recap-footer theme rule",
		handler: async (args, ctx) => {
			const filter = args.trim().toLowerCase();
			const names = filter
				? THEME_NAMES.filter((name) => name.includes(filter))
				: THEME_NAMES;
			if (names.length === 0) {
				ctx.ui.notify(`No theme matches "${filter}"`, "warning");
				return;
			}
			pi.appendEntry("recap-footer-themes", {
				text: names.map((name) => `${name}\n${buildRule(name)}`).join("\n\n"),
			});
		},
	});

	pi.registerCommand("footer-shuffle", {
		description: "Give this session a different rule",
		handler: async (_args, ctx) => {
			const current = buildStamp({
				sessionId: ctx.sessionManager.getSessionId(),
				cwd: ctx.cwd,
				theme: themeFor(),
			}).theme;

			shuffled = nextTheme(current);
			// Persisted, not just remembered: a resumed session keeps the new rule.
			pi.appendEntry<ShuffleEntry>(SHUFFLE_ENTRY, { theme: shuffled });
		},
	});

	pi.registerEntryRenderer<ShuffleEntry>(
		SHUFFLE_ENTRY,
		(entry, _options, theme) =>
			entry.data?.theme
				? new Text(theme.fg("dim", buildRule(entry.data.theme)), 1, 0)
				: undefined,
	);

	pi.registerCommand("footer-stamp", {
		description: "Show the current session's footer stamp, theme and rule",
		handler: async (_args, ctx) => {
			const stamp = buildStamp({
				sessionId: ctx.sessionManager.getSessionId(),
				sessionFile: ctx.sessionManager.getSessionFile() ?? undefined,
				cwd: ctx.cwd,
				timeZone: config.timeZone,
				theme: themeFor(),
			});
			pi.appendEntry("recap-footer-themes", {
				text: [
					`stamp   ${stamp.stamp}`,
					`theme   ${stamp.theme}`,
					stamp.rule,
				].join("\n"),
			});
		},
	});

	pi.registerEntryRenderer<{ text: string }>(
		"recap-footer-themes",
		(entry, _options, theme) =>
			entry.data?.text
				? new Text(theme.fg("dim", entry.data.text), 1, 0)
				: undefined,
	);
}
