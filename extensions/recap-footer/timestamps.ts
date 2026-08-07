import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import type { RecapFooterConfig } from "./config.js";

export const ENTRY_TYPE = "recap-timestamp";

export interface TimestampEntry {
	timestamp: number;
	/** Tool name, when the row marks the end of a tool execution. */
	tool?: string;
	/** Present and true when the tool call failed. */
	failed?: boolean;
}

export function formatRow(
	entry: TimestampEntry,
	config: RecapFooterConfig,
): string {
	const zone =
		config.timeZone === "system" ? undefined : (config.timeZone as string);
	const time = new Date(entry.timestamp).toLocaleString(undefined, {
		...config.timestamps.format,
		...(zone ? { timeZone: zone } : {}),
	});
	if (!entry.tool) return time;
	return `${time} · ${entry.tool}${entry.failed ? " (failed)" : ""}`;
}

/**
 * Dim timestamp rows in the transcript, so scrolling back tells you *when*
 * things happened.
 *
 * These are durable session entries (`appendEntry` + `registerEntryRenderer`),
 * not `ui.notify` calls: they survive scrollback and resume, and they never
 * enter the model's context.
 */
export function registerTimestamps(
	pi: ExtensionAPI,
	getConfig: () => RecapFooterConfig,
): void {
	pi.registerEntryRenderer<TimestampEntry>(
		ENTRY_TYPE,
		(entry, _options, theme) => {
			const data = entry.data;
			if (!data || typeof data.timestamp !== "number") return;
			return new Text(theme.fg("dim", formatRow(data, getConfig())), 1, 0);
		},
	);

	pi.on("tool_execution_end", (event) => {
		if (!getConfig().timestamps.tools) return;
		pi.appendEntry<TimestampEntry>(ENTRY_TYPE, {
			timestamp: Date.now(),
			tool: event.toolName,
			...(event.isError ? { failed: true } : {}),
		});
	});

	pi.on("turn_end", (event) => {
		if (!getConfig().timestamps.assistant) return;
		if (event.message.role !== "assistant") return;
		pi.appendEntry<TimestampEntry>(ENTRY_TYPE, {
			timestamp: event.message.timestamp ?? Date.now(),
		});
	});

	pi.on("message_end", (event) => {
		if (!getConfig().timestamps.user) return;
		if (event.message.role !== "user") return;
		pi.appendEntry<TimestampEntry>(ENTRY_TYPE, {
			timestamp: event.message.timestamp ?? Date.now(),
		});
	});
}
