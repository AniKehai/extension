import { describe, expect, it } from "vitest";
import { reanimeStrategy } from "../../../src/scraper/sites/reanime";
import { loadFixture, setBody, setHead, visit } from "../../helpers/dom";

const NULLS = { title: null, episode: null, coverUrl: null };
const TITLE = "Overgeared - Episode 2 | Re:ANIME";

describe("reanimeStrategy", () => {
	it("declares its domain and player iframe", () => {
		expect(reanimeStrategy.domains).toEqual([
			"reanime.to",
			"reanime.cz",
			"reanime.wtf",
		]);
		expect(reanimeStrategy.iframe_src).toEqual(["flixcloud.cc"]);
	});

	it.each(["/home", "/search?q=x", "/"])("reports nothing on %s", (path) => {
		visit(path, TITLE);
		expect(reanimeStrategy.getAnimeMetadata()).toEqual(NULLS);
	});

	it("parses title and episode from <title> and finds the episode name in the list", () => {
		visit("/watch/overgeared-vc4j78?ep=2", TITLE);
		setHead(
			'<meta property="og:image" content=" https://s4.anilist.co/o.jpg ">',
		);
		setBody(loadFixture("reanime/watch.html.fixture"));

		expect(reanimeStrategy.getAnimeMetadata()).toEqual({
			title: "Overgeared",
			episode: "Episode 2",
			episodeName: "Grid's Trial",
			coverUrl: "https://s4.anilist.co/o.jpg",
		});
	});

	it("skips EP numbers, SUB/DUB badges and dates when looking for the name", () => {
		visit("/watch/overgeared-vc4j78?ep=1", "Overgeared - Episode 1 | Re:ANIME");
		setBody(loadFixture("reanime/watch.html.fixture"));
		expect(reanimeStrategy.getAnimeMetadata().episodeName).toBe(
			"The Beginning",
		);
	});

	it("omits episodeName when the site only repeats 'Episode N'", () => {
		visit("/watch/overgeared-vc4j78?ep=3", "Overgeared - Episode 3 | Re:ANIME");
		setBody(loadFixture("reanime/watch.html.fixture"));
		expect(reanimeStrategy.getAnimeMetadata().episodeName).toBeNull();
	});

	it("falls back to ?ep= when <title> is not in the expected shape", () => {
		visit("/watch/x?ep=12.5", "Weird title");
		expect(reanimeStrategy.getAnimeMetadata()).toMatchObject({
			title: null,
			episode: "Episode 12.5",
		});
	});

	it("rejects a non-numeric ?ep= when <title> doesn't match", () => {
		visit("/watch/x?ep=junk", "Weird title");
		expect(reanimeStrategy.getAnimeMetadata().episode).toBeNull();
	});

	it("returns null cover when og:image is missing", () => {
		visit("/watch/x?ep=2", TITLE);
		expect(reanimeStrategy.getAnimeMetadata().coverUrl).toBeNull();
	});

	it("returns null episodeName when the list has no matching link", () => {
		visit("/watch/x?ep=9", "Overgeared - Episode 9 | Re:ANIME");
		setBody(loadFixture("reanime/watch.html.fixture"));
		expect(reanimeStrategy.getAnimeMetadata().episodeName).toBeNull();
	});
});
