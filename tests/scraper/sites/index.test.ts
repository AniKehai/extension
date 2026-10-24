import { describe, expect, it } from "vitest";
import { strategies } from "../../../src/scraper/sites/index";

const HOSTNAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i;

describe("strategies registry", () => {
	it("registers the 9 supported sites", () => {
		expect(strategies).toHaveLength(9);
	});

	describe.each(
		strategies.map((s, i) => [s.domains[0] ?? `#${i}`, s] as const),
	)("%s", (_name, strategy) => {
		it("has at least one domain", () => {
			expect(strategy.domains.length).toBeGreaterThan(0);
		});

		it("uses bare hostnames (no protocol, path, port or wildcard)", () => {
			for (const host of [...strategy.domains, ...strategy.iframe_src]) {
				expect(host).toMatch(HOSTNAME);
			}
		});

		it("has no duplicate entries within itself", () => {
			expect(new Set(strategy.domains).size).toBe(strategy.domains.length);
			expect(new Set(strategy.iframe_src).size).toBe(
				strategy.iframe_src.length,
			);
		});

		it("implements both scraper functions", () => {
			expect(strategy.getAnimeMetadata).toBeTypeOf("function");
			expect(strategy.getProgressStats).toBeTypeOf("function");
		});

		it("returns a well-formed metadata object on an empty page", () => {
			const meta = strategy.getAnimeMetadata();
			expect(meta).toHaveProperty("title");
			expect(meta).toHaveProperty("episode");
			expect(meta).toHaveProperty("coverUrl");
			expect(meta.title || null).toBeNull();
			expect(meta.episode || null).toBeNull();
		});

		it("returns well-formed progress stats on a page without a player", () => {
			expect(strategy.getProgressStats()).toEqual({
				currentMs: 0,
				durationMs: 0,
				isPaused: null,
			});
		});
	});

	it("never shares a site domain between two strategies", () => {
		const all = strategies.flatMap((s) => s.domains);
		expect(new Set(all).size).toBe(all.length);
	});

	it("site domains and player-iframe hosts never overlap", () => {
		const domains = new Set(strategies.flatMap((s) => s.domains));
		for (const iframe of strategies.flatMap((s) => s.iframe_src)) {
			expect(domains.has(iframe), `${iframe} is both a site and a player`).toBe(
				false,
			);
		}
	});
});
