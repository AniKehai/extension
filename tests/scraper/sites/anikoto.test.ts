import { describe, expect, it } from "vitest";
import { anikotoStrategy } from "../../../src/scraper/sites/anikoto";
import { loadFixture, mockVideo, setBody } from "../../helpers/dom";

describe("anikotoStrategy", () => {
	it("declares its domains and player iframes", () => {
		expect(anikotoStrategy.domains).toEqual(["anikototv.to", "anikoto.cz"]);
		expect(anikotoStrategy.iframe_src).toContain("megaplay.buzz");
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("anikoto/watch.html.fixture"));
		expect(anikotoStrategy.getAnimeMetadata()).toEqual({
			title: "Frieren: Beyond Journey's End",
			episode: "Episode 3",
			episodeName: "Killing Magic",
			coverUrl: "https://anikoto.example/poster/frieren.jpg",
		});
	});

	it("returns null title/episode/cover on a non-watch page", () => {
		setBody("<div>home</div>");
		expect(anikotoStrategy.getAnimeMetadata()).toEqual({
			title: null,
			episode: null,
			episodeName: null,
			coverUrl: null,
		});
	});

	it("omits episodeName when it merely repeats the episode label", () => {
		setBody(`
			<h1 class="title">Show</h1>
			<div class="tip"><b>Episode 1</b></div>
			<div id="w-episodes"><ul class="ep-range">
				<a class="active"><span class="d-title">Episode 1</span></a>
			</ul></div>`);
		expect(anikotoStrategy.getAnimeMetadata().episodeName).toBeNull();
	});

	it("uses getStandardVideoStats for progress", () => {
		setBody("<video></video>");
		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: 60,
			currentTime: 30,
			paused: false,
		});
		expect(anikotoStrategy.getProgressStats()).toMatchObject({
			currentMs: 30_000,
			durationMs: 60_000,
		});
	});
});
