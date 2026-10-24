import { describe, expect, it } from "vitest";
import { hianimeStrategy } from "../../../src/scraper/sites/hianime";
import { loadFixture, setBody } from "../../helpers/dom";

describe("hianimeStrategy", () => {
	it("declares its domain and player iframes", () => {
		expect(hianimeStrategy.domains).toEqual(["hianime.at"]);
		expect(hianimeStrategy.iframe_src).toEqual([
			"zokoanime.video",
			"megaplay.buzz",
		]);
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("hianime/watch.html.fixture"));
		expect(hianimeStrategy.getAnimeMetadata()).toEqual({
			title: "Bocchi the Rock!",
			episode: "Episode 4",
			episodeName: "Four Eyes",
			coverUrl: "https://hianime.example/p/bocchi.jpg",
		});
	});

	it("supports the alternate .ep-item.active selector for the episode name", () => {
		setBody(`
			<div class="anisc-detail"><div class="film-name"><a>Show</a></div></div>
			<div class="server-notice"><b>Episode 9</b></div>
			<div class="ep-item active"><span class="ep-name">Nine Lives</span></div>`);
		expect(hianimeStrategy.getAnimeMetadata().episodeName).toBe("Nine Lives");
	});

	it("returns nulls when not on a watch page", () => {
		setBody("<div></div>");
		expect(hianimeStrategy.getAnimeMetadata()).toEqual({
			title: null,
			episode: null,
			episodeName: null,
			coverUrl: null,
		});
	});
});
