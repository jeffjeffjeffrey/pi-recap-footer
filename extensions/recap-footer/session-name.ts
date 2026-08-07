import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { RecapFooterConfig } from "./config.js";

/**
 * The footer's summary line, as specified in RULE.md:
 *
 *   _`One-line past-tense summary of what was asked.`_
 *
 * The backticked form is canonical; the plain-italic form is the documented
 * fallback for summaries that must themselves contain a backtick.
 */
const BACKTICKED = /^_`(.+)`_$/;
const PLAIN_ITALIC = /^_([^_].*[^_])_$/;

export function extractSummary(text: string): string | undefined {
	// Walk backwards: the footer is the last thing in the message, and body text
	// may legitimately contain italics earlier on.
	const lines = text.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = (lines[i] ?? "").trim();
		if (!line) continue;
		const hit = BACKTICKED.exec(line) ?? PLAIN_ITALIC.exec(line);
		if (hit?.[1]) {
			const summary = hit[1].trim();
			if (summary) return summary;
		}
	}
	return undefined;
}

/** Session names read better without the sentence-final period. */
export function toSessionName(summary: string, maxLength: number): string {
	const trimmed = summary.replace(/\s+/g, " ").trim().replace(/\.$/, "");
	if (trimmed.length <= maxLength) return trimmed;
	// Prefer a word boundary over a hard slice.
	const clipped = trimmed.slice(0, maxLength - 1);
	const lastSpace = clipped.lastIndexOf(" ");
	return `${(lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter(
			(block): block is { type: string; text: string } =>
				typeof block === "object" &&
				block !== null &&
				(block as { type?: unknown }).type === "text" &&
				typeof (block as { text?: unknown }).text === "string",
		)
		.map((block) => block.text)
		.join("\n");
}

/**
 * Names the session from the footer summary the model already writes, so this
 * costs no extra model call. `mode: "first"` freezes on the opening summary —
 * "why this session started" — which is what you want when scanning `/resume`.
 */
export function registerSessionName(
	pi: ExtensionAPI,
	getConfig: () => RecapFooterConfig,
): void {
	// Tracks names this extension set, so `mode: "latest"` can overwrite its own
	// name without ever clobbering one the user set via `/name`.
	let ours: string | undefined;

	pi.on("message_end", (event) => {
		const config = getConfig();
		if (!config.sessionName.enabled) return;
		if (event.message.role !== "assistant") return;

		const current = pi.getSessionName();
		if (current && current !== ours) return; // user-set name wins, always
		if (current && config.sessionName.mode === "first") return;

		const summary = extractSummary(textOf(event.message.content));
		if (!summary) return;

		const name = toSessionName(summary, config.sessionName.maxLength);
		if (!name || name === current) return;

		ours = name;
		pi.setSessionName(name);
	});
}
