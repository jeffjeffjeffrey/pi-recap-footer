/**
 * Locate the jiti loader that pi itself uses to load extensions.
 *
 * The tests import the `.ts` sources through jiti so that `.js` specifiers
 * pointing at `.ts` files resolve exactly as they will at runtime.
 *
 * jiti is not a dependency of this package — it ships inside pi. So it has to
 * be found at run time rather than pinned to a path with a pi version baked
 * into it: such a path goes stale on the very next `pi` upgrade and fails the
 * whole suite with a bare ERR_MODULE_NOT_FOUND that says nothing about why.
 */
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** `pi-0.84.10` sorts above `pi-0.84.9`, so compare numerically per part. */
function versionOf(name) {
	const match = /^pi-(\d+)\.(\d+)\.(\d+)/.exec(name);
	return match ? match.slice(1).map(Number) : undefined;
}

function comparePiDirsDesc(a, b) {
	const [x, y] = [versionOf(a), versionOf(b)];
	for (let i = 0; i < 3; i++) {
		const diff = (y?.[i] ?? 0) - (x?.[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** Every `node_modules/jiti` from `start` up to the filesystem root. */
function walkUp(start) {
	const found = [];
	let dir = start;
	for (;;) {
		found.push(join(dir, "node_modules", "jiti", "lib", "jiti.mjs"));
		const next = dirname(dir);
		if (next === dir || dir === parse(dir).root) return found;
		dir = next;
	}
}

export function jitiCandidates() {
	const paths = [];

	// 1. Explicit override, for a pi installed somewhere unusual.
	if (process.env.PI_JITI) paths.push(process.env.PI_JITI);

	// 2. A local or hoisted install. Resolved via package.json because
	//    `require.resolve("jiti")` picks the CJS entry, which has no
	//    `createJiti` named export when imported from ESM.
	try {
		paths.push(join(dirname(require.resolve("jiti/package.json")), "lib", "jiti.mjs"));
	} catch {}

	// 3. The pi packages installed under ~/.pi/pkg, newest version first.
	const pkgDir = join(homedir(), ".pi", "pkg");
	try {
		for (const name of readdirSync(pkgDir).sort(comparePiDirsDesc)) {
			if (name.startsWith("pi-")) {
				paths.push(join(pkgDir, name, "node_modules", "jiti", "lib", "jiti.mjs"));
			}
		}
	} catch {}

	// 4. Alongside the pi install this repo's peer deps are linked to. Followed
	//    through the symlink rather than via `require.resolve`, which the pi
	//    packages' exports map refuses (ERR_PACKAGE_PATH_NOT_EXPORTED — they
	//    publish types only). The target is a nix store path, so it can only be
	//    followed, never guessed.
	try {
		const link = join(ROOT, "node_modules/@earendil-works/pi-coding-agent");
		paths.push(...walkUp(realpathSync(link)));
	} catch {}

	return paths;
}

/** The jiti instance pi would use, or a diagnostic listing where we looked. */
export async function loadJiti(url) {
	const candidates = jitiCandidates();
	for (const path of candidates) {
		if (!existsSync(path)) continue;
		const { createJiti } = await import(pathToFileURL(path).href);
		return createJiti(url, { interopDefault: true });
	}
	throw new Error(
		[
			"Could not find jiti, which pi uses to load extensions.",
			"Install pi, or point PI_JITI at a jiti.mjs. Looked in:",
			...candidates.map((path) => `  ${path}`),
		].join("\n"),
	);
}
