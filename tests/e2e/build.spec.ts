import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const OUT = path.resolve(process.cwd(), ".output/chrome-mv3");
const manifest = () =>
	JSON.parse(readFileSync(path.join(OUT, "manifest.json"), "utf8"));

test.describe("chrome-mv3 build output", () => {
	test.beforeAll(() => {
		expect(existsSync(OUT), "run `bun run build:chrome` first").toBe(true);
	});

	test("is a valid MV3 manifest with the expected entrypoints", () => {
		const m = manifest();
		expect(m.manifest_version).toBe(3);
		expect(m.name).toBe("AniKehai");
		expect(m.background.service_worker).toBe("background.js");
		expect(m.action.default_popup).toBe("popup.html");
		expect(existsSync(path.join(OUT, "background.js"))).toBe(true);
		expect(existsSync(path.join(OUT, "popup.html"))).toBe(true);
	});

	test("version matches package.json", () => {
		const pkg = JSON.parse(readFileSync("package.json", "utf8"));
		expect(manifest().version).toBe(pkg.version);
	});

	test("content script runs in all frames on every supported site", () => {
		const [cs] = manifest().content_scripts;
		expect(cs.all_frames).toBe(true);
		expect(cs.matches.length).toBeGreaterThanOrEqual(8);
		for (const match of cs.matches) expect(match).toMatch(/^\*:\/\/[^/]+\/\*$/);
		for (const js of cs.js) expect(existsSync(path.join(OUT, js))).toBe(true);
	});

	test("requests only the permissions it needs", () => {
		const { permissions } = manifest();
		expect([...permissions].sort()).toEqual(
			expect.arrayContaining(["identity", "storage", "tabs"]),
		);

		for (const p of permissions) {
			expect(["identity", "storage", "tabs", "scripting"]).toContain(p);
		}
	});

	test("does not ship test files or fixtures", () => {
		const walk = (dir: string): string[] =>
			readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
				e.isDirectory()
					? walk(path.join(dir, e.name))
					: [path.join(dir, e.name)],
			);
		const offenders = walk(OUT).filter((f) =>
			/\.(test|spec|fixture)\./.test(f),
		);
		expect(offenders).toEqual([]);
	});
});
