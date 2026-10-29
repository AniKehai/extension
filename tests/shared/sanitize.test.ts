import { describe, expect, it } from "vitest";
import {
	ALLOWED_COVER_DOMAINS,
	MAX_COVER_URL_LENGTH,
	MAX_EPISODE_LENGTH,
	MAX_EPISODE_NAME_LENGTH,
	MAX_TITLE_LENGTH,
	sanitizeCoverUrl,
	sanitizeString,
} from "../../src/shared/sanitize";

describe("sanitizeString", () => {
	it("returns an empty string for empty input", () => {
		expect(sanitizeString("", MAX_TITLE_LENGTH)).toBe("");
		expect(sanitizeString(null, MAX_TITLE_LENGTH)).toBe("");
		expect(sanitizeString(undefined, MAX_TITLE_LENGTH)).toBe("");
	});

	it("removes control characters", () => {
		const bell = String.fromCharCode(7);
		const nullByte = String.fromCharCode(0);
		expect(sanitizeString(`Frieren${bell}${nullByte}`, MAX_TITLE_LENGTH)).toBe(
			"Frieren",
		);
	});

	it("trims surrounding whitespace", () => {
		expect(sanitizeString("   Frieren   ", MAX_TITLE_LENGTH)).toBe("Frieren");
	});

	it("truncates to the given maximum length", () => {
		expect(sanitizeString("A".repeat(500), MAX_TITLE_LENGTH)).toHaveLength(
			MAX_TITLE_LENGTH,
		);
		expect(sanitizeString("B".repeat(500), MAX_EPISODE_LENGTH)).toHaveLength(
			MAX_EPISODE_LENGTH,
		);
		expect(
			sanitizeString("C".repeat(500), MAX_EPISODE_NAME_LENGTH),
		).toHaveLength(MAX_EPISODE_NAME_LENGTH);
	});
});

describe("sanitizeCoverUrl", () => {
	it("returns an empty string for empty input", () => {
		expect(sanitizeCoverUrl("")).toBe("");
		expect(sanitizeCoverUrl(null)).toBe("");
		expect(sanitizeCoverUrl(undefined)).toBe("");
	});

	it("keeps HTTPS URLs from trusted hosts", () => {
		expect(
			sanitizeCoverUrl("https://s4.anilist.co/file/anilistcdn/c.jpg"),
		).toBe("https://s4.anilist.co/file/anilistcdn/c.jpg");
		expect(sanitizeCoverUrl("https://s4.anilist.co/cover.jpg")).toBe(
			"https://s4.anilist.co/cover.jpg",
		);
		expect(sanitizeCoverUrl("https://kaa.lt/image/poster/abc.webp")).toBe(
			"https://kaa.lt/image/poster/abc.webp",
		);
	});

	it("trims surrounding whitespace", () => {
		expect(sanitizeCoverUrl("  https://s4.anilist.co/c.jpg  ")).toBe(
			"https://s4.anilist.co/c.jpg",
		);
	});

	it("rejects non-HTTPS URLs", () => {
		expect(sanitizeCoverUrl("http://img.anili.st/c.jpg")).toBe("");
		expect(sanitizeCoverUrl("javascript:alert(1)")).toBe("");
		expect(sanitizeCoverUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(
			"",
		);
	});

	it("rejects malformed URLs", () => {
		expect(sanitizeCoverUrl("not a url")).toBe("");
		expect(sanitizeCoverUrl("https://")).toBe("");
	});

	it("rejects hosts that are not in the allow list", () => {
		expect(sanitizeCoverUrl("https://evil.example/c.jpg")).toBe("");
		expect(sanitizeCoverUrl("https://tracker.example/pixel.gif")).toBe("");
	});

	it("rejects hosts that merely look like an allowed host", () => {
		expect(sanitizeCoverUrl("https://evil-anili.st/c.jpg")).toBe("");
		expect(sanitizeCoverUrl("https://anilist.co.evil.example/c.jpg")).toBe("");
		expect(sanitizeCoverUrl("https://notanilist.co/c.jpg")).toBe("");
	});

	it("rejects URLs carrying credentials", () => {
		expect(sanitizeCoverUrl("https://user:pass@img.anili.st/c.jpg")).toBe("");
	});

	it("limits the URL length", () => {
		const long = `https://s4.anilist.co/${"a".repeat(5000)}.jpg`;
		expect(sanitizeCoverUrl(long)).toHaveLength(MAX_COVER_URL_LENGTH);
	});

	it("allows every host listed in the allow list", () => {
		for (const domain of ALLOWED_COVER_DOMAINS) {
			expect(sanitizeCoverUrl(`https://${domain}/cover.jpg`)).toBe(
				`https://${domain}/cover.jpg`,
			);
		}
	});
});
