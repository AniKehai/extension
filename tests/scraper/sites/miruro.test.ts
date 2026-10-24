import { describe, expect, it } from "vitest";
import { miruroStrategy } from "../../../src/scraper/sites/miruro";
import { loadFixture, setBody, visit } from "../../helpers/dom";

const NULLS = { title: null, episode: null, coverUrl: null };

describe("miruroStrategy", () => {
	it("covers every miruro mirror domain and the strm.cx player", () => {
		expect(miruroStrategy.domains).toEqual(
			expect.arrayContaining(["www.miruro.tv", "www.miruro.to"]),
		);
		expect(miruroStrategy.iframe_src).toEqual(["strm.cx"]);
	});

	it.each(["/", "/info/12345", "/search?q=x"])(
		"reports nothing outside /watch/ (%s)",
		(path) => {
			visit(path);
			setBody(loadFixture("miruro/watch.html.fixture"));
			expect(miruroStrategy.getAnimeMetadata()).toEqual(NULLS);
		},
	);

	it("scrapes a watch page: AniList cover alt = title, header = episode + name", () => {
		visit("/watch/oshi-no-ko?ep=3");
		setBody(loadFixture("miruro/watch.html.fixture"));

		expect(miruroStrategy.getAnimeMetadata()).toEqual({
			title: "Oshi no Ko",
			episode: "Episode 3",
			episodeName: "Idol",
			coverUrl: "https://s4.anilistcdn/media/anime/cover/large/bx1.jpg",
		});
	});

	it("ignores images that are not AniList covers", () => {
		visit("/watch/x?ep=1");
		setBody('<img src="https://other.example/logo.png" alt="logo">');
		expect(miruroStrategy.getAnimeMetadata().title).toBeNull();
		expect(miruroStrategy.getAnimeMetadata().coverUrl).toBeNull();
	});

	it("falls back to the ?ep= query param when the header is missing", () => {
		visit("/watch/x?ep=7");
		setBody("<div></div>");
		expect(miruroStrategy.getAnimeMetadata().episode).toBe("Episode 7");
	});

	it("accepts decimal ?ep= values and rejects junk", () => {
		visit("/watch/x?ep=7.5");
		expect(miruroStrategy.getAnimeMetadata().episode).toBe("Episode 7.5");

		visit("/watch/x?ep=abc");
		expect(miruroStrategy.getAnimeMetadata().episode).toBeNull();

		visit("/watch/x?ep=%3Cscript%3E");
		expect(miruroStrategy.getAnimeMetadata().episode).toBeNull();
	});

	it("skips an episode name that just repeats 'Episode N'", () => {
		visit("/watch/x?ep=3");
		setBody("<h1>Episode 3</h1><p>Episode 3</p>");
		expect(miruroStrategy.getAnimeMetadata().episodeName).toBeNull();
	});
});
