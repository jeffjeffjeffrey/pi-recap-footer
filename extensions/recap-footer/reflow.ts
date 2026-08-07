import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { RecapFooterConfig } from "./config.js";
import { buildRuleAt } from "./stamp.js";
import {
	TEXT_THEMES,
	THEME_NAMES,
	TRAIN_CABOOSE,
	TRAIN_CARS,
	TRAIN_GAGS,
	TRAIN_LOCO,
} from "./themes.js";

/** Below this a line is too short to be a rule and too likely to be prose. */
const MIN_GLYPHS = 8;
/** Guard against a pathological terminal width producing a huge row. */
const MAX_GLYPHS = 400;

const TRAIN_PARTS = new Set([...TRAIN_CARS, ...TRAIN_GAGS]);

function stripTicks(line: string): { body: string; teal: boolean } {
	if (line.length > 2 && line.startsWith("`") && line.endsWith("`")) {
		return { body: line.slice(1, -1), teal: true };
	}
	return { body: line, teal: false };
}

/**
 * Is this line a rule, and if so, which theme?
 *
 * Exact reconstruction rather than set membership: themes share glyphs (`🌭` is
 * in both `hotdogs` and `junkfood`, `🌵` in both `forest` and `desert`), so
 * "every glyph belongs to theme X" is ambiguous. Rebuilding the row at the
 * observed length and comparing is unambiguous and just as cheap.
 */
export function detectTheme(line: string): string | undefined {
	const { body, teal } = stripTicks(line);
	if (!body || /\s/.test(body)) return undefined;

	const glyphs = [...body];
	if (glyphs.length < MIN_GLYPHS) return undefined;

	// Trains are randomised per render, so match structurally.
	if (
		glyphs[0] === TRAIN_LOCO &&
		glyphs[glyphs.length - 1] === TRAIN_CABOOSE &&
		glyphs.slice(1, -1).every((glyph) => TRAIN_PARTS.has(glyph))
	) {
		return "trains";
	}

	for (const name of THEME_NAMES) {
		if (name === "trains") continue;
		// A text theme's row is backticked or not; don't cross-match.
		if (Boolean(TEXT_THEMES[name]?.teal) !== teal) continue;
		if (buildRuleAt(name, glyphs.length) === line) return name;
	}
	return undefined;
}

/** Glyphs that fit in `availableWidth` columns for this theme. */
export function glyphsForWidth(theme: string, availableWidth: number): number {
	// Emoji are double-width; text-wave glyphs are single-width.
	const raw = TEXT_THEMES[theme]
		? availableWidth
		: Math.floor(availableWidth / 2);
	return Math.max(MIN_GLYPHS, Math.min(MAX_GLYPHS, raw));
}

/**
 * Rewrite every rule line to fill the terminal.
 *
 * Fenced code blocks are skipped: documentation and chat transcripts routinely
 * quote a rule row inside a fence, and stretching those would corrupt the
 * example being shown.
 */
export function reflowMarkdown(
	markdown: string,
	availableWidth: number,
): string {
	if (!Number.isFinite(availableWidth) || availableWidth < MIN_GLYPHS) {
		return markdown;
	}

	const lines = markdown.split("\n");
	let fence: string | undefined;
	let changed = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] as string;
		const trimmed = line.trim();

		const fenceMatch = /^(```+|~~~+)/.exec(trimmed);
		if (fenceMatch) {
			const marker = fenceMatch[1] as string;
			if (fence === undefined) fence = marker[0];
			else if (marker[0] === fence) fence = undefined;
			continue;
		}
		if (fence !== undefined) continue;
		if (trimmed !== line) continue; // indented: code block or list content

		const theme = detectTheme(trimmed);
		if (!theme) continue;

		const rebuilt = buildRuleAt(theme, glyphsForWidth(theme, availableWidth));
		if (rebuilt !== line) {
			lines[i] = rebuilt;
			changed = true;
		}
	}

	return changed ? lines.join("\n") : markdown;
}

/**
 * Display-only: the stored message and the model's context keep the canonical
 * 40-glyph row, so copy-paste and `-p` output stay portable. Pi re-runs this on
 * terminal resize, so the rule tracks the window.
 */
export function registerReflow(
	pi: ExtensionAPI,
	getConfig: () => RecapFooterConfig,
): void {
	pi.registerMarkdownTransformer((markdown, context) => {
		if (!getConfig().fillWidth) return markdown;
		if (context.messageType !== "assistant") return markdown;
		// Skip partial streams: a half-written row would be stretched to full
		// width and then restretched as the rest arrives.
		if (context.isStreaming) return markdown;
		return reflowMarkdown(markdown, context.availableWidth);
	});
}
