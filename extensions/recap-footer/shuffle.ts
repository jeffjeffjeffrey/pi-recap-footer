import { THEME_NAMES } from "./themes.js";

/** Entry type recording a shuffled theme. Also renders the new rule. */
export const SHUFFLE_ENTRY = "recap-footer-shuffle";

export interface ShuffleEntry {
	theme: string;
}

/**
 * A theme other than `current`, at random.
 *
 * Excluding the current one matters: shuffling is what you reach for when two
 * windows collided, and landing on the same theme again looks like the command
 * did nothing.
 */
export function nextTheme(
	current: string | undefined,
	random: () => number = Math.random,
): string {
	const options = THEME_NAMES.filter((name) => name !== current);
	const pool = options.length > 0 ? options : THEME_NAMES;
	const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
	return pool[index] as string;
}

/**
 * The most recently shuffled theme in this session, or `undefined` if it was
 * never shuffled.
 *
 * Read from the session's own entries, so the choice survives a resume: the
 * whole point is that the rule stays put once you have changed it.
 */
export function shuffledTheme(
	entries: Iterable<{
		type?: string;
		customType?: string;
		data?: unknown;
	}>,
): string | undefined {
	let theme: string | undefined;
	for (const entry of entries) {
		if (entry.type !== "custom" || entry.customType !== SHUFFLE_ENTRY) continue;
		const candidate = (entry.data as ShuffleEntry | undefined)?.theme;
		if (candidate && THEME_NAMES.includes(candidate)) theme = candidate;
	}
	return theme;
}
