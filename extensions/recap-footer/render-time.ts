import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import type { RecapFooterConfig } from "./config.js";
import { formatStamp } from "./stamp.js";

/**
 * The footer's own timestamp line: a code span holding the stamp this package
 * produces, e.g. `Fri Aug 7, 2026 · 5:00 PM EDT`. Anchored on the weekday and
 * the middle dot so ordinary backticked prose on the last line is never
 * mistaken for it.
 */
const STAMP_LINE =
  /^`((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} \d{1,2}, \d{4} · [^`]*)`$/;

/** `3m 24s`, `45s`, `1h 22m`. */
export function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "";
	const total = Math.round(ms / 1000);
	if (total < 1) return "<1s";
	if (total < 60) return `${total}s`;

	const minutes = Math.floor(total / 60);
	if (minutes < 60) {
		const seconds = total % 60;
		return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
	}

	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface RewriteOptions {
	renderedAt: Date;
	/** Milliseconds from the user's submit to this message finalising. */
	durationMs?: number;
	timeZone?: string;
	showDuration?: boolean;
}

/**
 * Replace the footer's timestamp with the moment the answer actually landed,
 * plus how long the turn took.
 *
 * Returns the text unchanged when there is no footer stamp to replace, so a
 * response without a footer, or one from another harness, is never touched.
 */
export function rewriteFooterTimestamp(
	text: string,
	options: RewriteOptions,
): string {
	const lines = text.split("\n");

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = (lines[i] ?? "").trim();
		if (!line) continue;
		if (!STAMP_LINE.test(line)) break; // the stamp is last; stop at other content

		const stamp = formatStamp(options.renderedAt, options.timeZone);
		const worked =
			options.showDuration !== false && options.durationMs !== undefined
				? formatDuration(options.durationMs)
				: "";
		lines[i] = worked ? `\`${stamp}\` _(worked for ${worked})_` : `\`${stamp}\``;
		return lines.join("\n");
	}
	return text;
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
 * Rewrites at `message_end` rather than in the markdown transformer.
 *
 * The transformer re-runs on every terminal resize, so computing "now" there
 * would make the timestamp jump each time the window changed. `message_end`
 * fires once, and its replacement is persisted — so the stored session, `-p`
 * output and a resumed transcript all carry the same, correct time.
 */
export function registerRenderTime(
	pi: ExtensionAPI,
	getConfig: () => RecapFooterConfig,
): void {
	let askedAtMs: number | undefined;

	pi.on("before_agent_start", () => {
		askedAtMs = Date.now();
	});

	pi.on("message_end", (event) => {
		const config = getConfig();
		if (config.timestamp.mode !== "render") return;
		if (event.message.role !== "assistant") return;

		const original = textOf(event.message.content);
		if (!original) return;

		const renderedAtMs = Date.now();
		const rewritten = rewriteFooterTimestamp(original, {
			renderedAt: new Date(renderedAtMs),
			durationMs:
				askedAtMs === undefined ? undefined : renderedAtMs - askedAtMs,
			timeZone: config.timeZone,
			showDuration: config.timestamp.showDuration,
		});
		// Only the final message of a turn carries a footer; tool-calling
		// assistant messages come back unchanged and are left alone.
		if (rewritten === original) return;

		return {
			message: {
				...event.message,
				content: [{ type: "text" as const, text: rewritten }],
			},
		};
	});
}
