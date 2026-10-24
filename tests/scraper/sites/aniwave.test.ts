import { describe, expect, it } from "vitest";
import { aniwaveStrategy } from "../../../src/scraper/sites/aniwave";
import { loadFixture, setBody } from "../../helpers/dom";

describe("aniwaveStrategy", () => {
	it("declares its domain and player iframes", () => {
		expect(aniwaveStrategy.domains).toEqual(["aniwaves.ru"]);
		expect(aniwaveStrategy.iframe_src.length).toBeGreaterThan(0);
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("aniwave/watch.html.fixture"));
		const meta = aniwaveStrategy.getAnimeMetadata();
		expect(meta.episode).toBe("Episode 5");
		expect(meta.episodeName).toBe("Arise");
		expect(meta.coverUrl).toBe("https://aniwave.example/p/solo.jpg");
		expect(meta.title).toContain("Solo Leveling");
	});

	it("strips the trailing 'Episode N' from the page title", () => {
		setBody(loadFixture("aniwave/watch.html.fixture"));
		expect(aniwaveStrategy.getAnimeMetadata().title).not.toContain("Episode");
	});

	it("returns the title without trailing whitespace", () => {
		setBody(loadFixture("aniwave/watch.html.fixture"));
		expect(aniwaveStrategy.getAnimeMetadata().title).toBe("Solo Leveling");
	});

	it("returns nulls when elements are missing", () => {
		setBody("<p>nothing</p>");
		expect(aniwaveStrategy.getAnimeMetadata()).toEqual({
			title: null,
			episode: null,
			episodeName: null,
			coverUrl: null,
		});
	});
});
