import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";

export interface RecapFooterConfig {
	/**
	 * Append the footer rule (RULE.md) to the system prompt.
	 *
	 * Leave `false` if the rule already lives in your AGENTS.md — otherwise the
	 * model gets the same instructions twice.
	 */
	injectRule: boolean;
	/** IANA zone for the stamp, or `"system"` for the host's local zone. */
	timeZone: string;
	/** Pin every session to one theme instead of deriving it from the session id. */
	theme?: string;
	/** Derive the session name from the first footer summary. */
	sessionName: {
		enabled: boolean;
		/** `"first"` freezes on the opening summary; `"latest"` tracks the newest. */
		mode: "first" | "latest";
		maxLength: number;
	};
	/** Dim timestamp rows in the transcript. */
	timestamps: {
		tools: boolean;
		assistant: boolean;
		user: boolean;
		/** `Intl.DateTimeFormat` options for the transcript rows. */
		format: Intl.DateTimeFormatOptions;
	};
}

export const DEFAULTS: RecapFooterConfig = {
	injectRule: false,
	timeZone: "system",
	sessionName: { enabled: true, mode: "first", maxLength: 72 },
	timestamps: {
		tools: true,
		assistant: true,
		user: false,
		format: {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		},
	},
};

function readJson(path: string): Record<string, unknown> | undefined {
	try {
		return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, patch: unknown): T {
	if (!isPlainObject(patch)) return base;
	const out = { ...(base as Record<string, unknown>) };
	for (const [key, value] of Object.entries(patch)) {
		const current = out[key];
		out[key] =
			isPlainObject(current) && isPlainObject(value)
				? merge(current, value)
				: value;
	}
	return out as T;
}

export const CONFIG_FILENAME = "recap-footer.json";

/**
 * Global config, then project config layered on top. Project config is only
 * honoured for trusted projects — it can change what reaches the model.
 */
export function loadConfig(
	cwd: string,
	projectTrusted: boolean,
): RecapFooterConfig {
	const globalPath = join(homedir(), ".pi", "agent", CONFIG_FILENAME);
	let config = merge(DEFAULTS, readJson(globalPath));

	if (projectTrusted) {
		const projectPath = join(cwd, CONFIG_DIR_NAME, CONFIG_FILENAME);
		config = merge(config, readJson(projectPath));
	}
	return config;
}
