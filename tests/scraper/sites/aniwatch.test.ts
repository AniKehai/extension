import { describe, expect, it } from "vitest";
import { aniwatchStrategy } from "../../../src/scraper/sites/aniwatch";
import { loadFixture, setBody } from "../../helpers/dom";

describe("aniwatchStrategy", () => {
	it("declares its domain and player iframes", () => {
		expect(aniwatchStrategy.domains).toEqual(["aniwatch.cx"]);
		expect(aniwatchStrategy.iframe_src).toEqual(
			expect.arrayContaining(["vidnest.fun", "megaplay.buzz"]),
		);
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("aniwatch/watch.html.fixture"));
		const meta = aniwatchStrategy.getAnimeMetadata();
		expect(meta.title).toContain("Dandadan");
		expect(meta.episode).toBe("Episode 7");
		expect(meta.episodeName).toBe("Evil Eye");
		expect(meta.coverUrl).toBe("https://aniwatch.example/p/dandadan.jpg");
	});

	it("does not include 'Episode N' in the title", () => {
		setBody(loadFixture("aniwatch/watch.html.fixture"));
		expect(aniwatchStrategy.getAnimeMetadata().title).not.toContain("Episode");
	});

	it("returns the title without trailing whitespace", () => {
		setBody(loadFixture("aniwatch/watch.html.fixture"));
		expect(aniwatchStrategy.getAnimeMetadata().title).toBe("Dandadan");
	});

	it("omits episodeName when it equals the episode label", () => {
		setBody(`
			<div class="awt-watch-info-bar"><div class="awt-wib-meta"><h1 class="awt-wib-title">X</h1></div></div>
			<span id="wc-ep-label">Episode 2</span>
			<div id="episodes-list"><a class="ws-ep--active"><span class="awt-ws-ep__title">Episode 2</span></a></div>`);
		expect(aniwatchStrategy.getAnimeMetadata().episodeName).toBeNull();
	});

	it("returns nulls on a page without the player header", () => {
		setBody("<div></div>");
		expect(aniwatchStrategy.getAnimeMetadata()).toMatchObject({
			title: null,
			episode: null,
			coverUrl: null,
		});
	});
});
