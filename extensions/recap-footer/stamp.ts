import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
	EMOJI_THEMES,
	EMOJI_WIDTH,
	TEXT_THEMES,
	TEXT_WIDTH,
	THEME_NAMES,
	TRAIN_CABOOSE,
	TRAIN_CARS,
	TRAIN_GAGS,
	TRAIN_GAG_ODDS,
	TRAIN_LOCO,
} from "./themes.js";

export interface Stamp {
	/** Formatted request time, e.g. `Thu Aug 6, 2026 · 4:47 PM EDT`. */
	stamp: string;
	/** First 300 chars of the request, whitespace-collapsed. */
	ask: string;
	/** Theme name for this session. */
	theme: string;
	/** Ready-to-paste rule line. */
	rule: string;
	/** True when no real request timestamp could be resolved. */
	approximate: boolean;
}

export interface StampOptions {
	/** Session id — seeds the theme. Falls back to `cwd`. */
	sessionId?: string;
	/** Session JSONL path, read only when `timestampMs` is absent. */
	sessionFile?: string;
	/** Request time in epoch ms, supplied by the extension before the log is written. */
	timestampMs?: number;
	/** Request text, supplied by the extension before the log is written. */
	ask?: string;
	cwd?: string;
	/** IANA zone, or `"system"` for the host's local zone. */
	timeZone?: string;
	/** Force a theme instead of deriving one from the session id. */
	theme?: string;
}

/**
 * `Thu Aug 6, 2026 · 4:47 PM EDT`
 *
 * Assembled from `formatToParts` rather than a format string so the separator,
 * the lack of a comma after the weekday, and the non-padded day/hour are exact
 * regardless of host locale.
 */
export function formatStamp(date: Date, timeZone?: string): string {
	const zone = !timeZone || timeZone === "system" ? undefined : timeZone;
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
		timeZoneName: "short",
	}).formatToParts(date);

	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return `${get("weekday")} ${get("month")} ${get("day")}, ${get("year")} · ${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")}`;
}

/**
 * sha256(seed) % themeCount, so one conversation keeps a single visual identity
 * for its whole life — across compaction, context loss, and resume weeks later —
 * with no stored state. BigInt because the digest is a 256-bit integer.
 */
export function pickTheme(seed: string): string {
	const digest = createHash("sha256").update(seed, "utf8").digest("hex");
	const index = Number(BigInt(`0x${digest}`) % BigInt(THEME_NAMES.length));
	return THEME_NAMES[index] as string;
}

function buildTrain(): string {
	// Fresh cars on every render; the theme itself stays fixed.
	const body: string[] = [];
	for (let i = 0; i < EMOJI_WIDTH - 2; i++) {
		const pool = Math.random() < TRAIN_GAG_ODDS ? TRAIN_GAGS : TRAIN_CARS;
		body.push(pool[Math.floor(Math.random() * pool.length)] as string);
	}
	return TRAIN_LOCO + body.join("") + TRAIN_CABOOSE;
}

function repeatTo(units: string[], width: number): string {
	const row: string[] = [];
	while (row.length < width) row.push(...units);
	return row.slice(0, width).join("");
}

export function buildRule(theme: string): string {
	if (theme === "trains") return buildTrain();

	const text = TEXT_THEMES[theme];
	if (text) {
		const row = repeatTo([...text.unit], TEXT_WIDTH);
		return text.teal ? `\`${row}\`` : row;
	}

	const emoji = EMOJI_THEMES[theme];
	if (!emoji) throw new Error(`unknown theme: ${theme}`);
	return repeatTo([...emoji], EMOJI_WIDTH);
}

export function collapse(text: string, limit = 300): string {
	return text.replace(/\s+/g, " ").trim().slice(0, limit);
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
		.filter(Boolean)
		.join("\n");
}

/**
 * Last user message in a pi session JSONL. Every user entry carries a true ISO
 * timestamp, which is what keeps the stamp correct when a session is resumed
 * days or months later.
 */
function lastUserMessage(
	path: string,
): { timestamp?: string; content?: unknown } | undefined {
	let found: { timestamp?: string; content?: unknown } | undefined;
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		return undefined;
	}

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || !trimmed.includes('"user"')) continue;
		let entry: {
			type?: string;
			timestamp?: string;
			message?: { role?: string; content?: unknown };
		};
		try {
			entry = JSON.parse(trimmed);
		} catch {
			continue;
		}
		if (entry.type !== "message" || entry.message?.role !== "user") continue;
		found = { timestamp: entry.timestamp, content: entry.message?.content };
	}
	return found;
}

export function buildStamp(options: StampOptions = {}): Stamp {
	const { sessionFile, timestampMs, timeZone } = options;

	let stamp: string | undefined;
	let ask = options.ask === undefined ? "" : collapse(options.ask);
	let approximate = false;

	if (timestampMs !== undefined && Number.isFinite(timestampMs)) {
		stamp = formatStamp(new Date(timestampMs), timeZone);
	}

	if (stamp === undefined && sessionFile) {
		const hit = lastUserMessage(sessionFile);
		if (hit?.timestamp) {
			const parsed = new Date(hit.timestamp);
			if (!Number.isNaN(parsed.getTime())) {
				stamp = formatStamp(parsed, timeZone);
				if (options.ask === undefined) ask = collapse(textOf(hit.content));
			}
		}
	}

	if (stamp === undefined) {
		stamp = `${formatStamp(new Date(), timeZone)} (approx: no session timestamp)`;
		approximate = true;
	}

	const theme =
		options.theme ?? pickTheme(options.sessionId || options.cwd || "");

	return { stamp, ask, theme, rule: buildRule(theme), approximate };
}
