import { describe, expect, it } from "vitest";
import { animexStrategy } from "../../../src/scraper/sites/animex";
import { loadFixture, mockVideo, setBody } from "../../helpers/dom";

const ACTIVE = "border-color: rgb(229, 9, 20);";

describe("animexStrategy", () => {
	it("declares its domains and player iframe", () => {
		expect(animexStrategy.domains).toEqual([
			"myanimex.com",
			"www.myanimex.com",
		]);
		expect(animexStrategy.iframe_src).toEqual(["player.mediadelivery.net"]);
	});

	it("scrapes a full watch page", () => {
		setBody(loadFixture("animex/watch.html.fixture"));

		expect(animexStrategy.getAnimeMetadata()).toEqual({
			title: "Frieren",
			episode: "Episode 2",
			episodeName: null,
			coverUrl: "https://animex.example/poster/abc.jpg",
		});
	});

	it("returns null metadata on a non-watch page", () => {
		setBody("<div>home</div>");

		expect(animexStrategy.getAnimeMetadata()).toEqual({
			title: null,
			episode: null,
			episodeName: null,
			coverUrl: null,
		});
	});

	it("returns a null episode when no episode button is highlighted", () => {
		setBody(`
            <h1>Frieren</h1>
            <h2>Episodes</h2>
            <div>
                <button>1</button>
                <button>2</button>
            </div>
        `);

		expect(animexStrategy.getAnimeMetadata()).toMatchObject({
			title: "Frieren",
			episode: null,
		});
	});

	it("keeps decimal episode numbers", () => {
		setBody(`
            <h1>Show</h1>
            <h2>Episodes</h2>
            <div>
                <button style="${ACTIVE}">Ep 5.5</button>
            </div>
        `);

		expect(animexStrategy.getAnimeMetadata().episode).toBe("Episode 5.5");
	});

	it("ignores highlighted buttons outside the Episodes section", () => {
		setBody(`
            <h1>Show</h1>
            <h2>Seasons</h2>
            <div>
                <button style="${ACTIVE}">2</button>
            </div>
        `);

		expect(animexStrategy.getAnimeMetadata().episode).toBeNull();
	});

	it("detects the active episode via a stylesheet class, not an inline style", () => {
		document.head.innerHTML = `
            <style>
                .on {
                    border-color: rgb(229, 9, 20);
                }
            </style>
        `;

		setBody(`
            <h1>Show</h1>
            <h2>Episodes</h2>
            <div>
                <button>1</button>
                <button class="on">2</button>
            </div>
        `);

		expect(animexStrategy.getAnimeMetadata().episode).toBe("Episode 2");
	});

	it("skips gradients and data URIs to extract the first http(s) cover URL", () => {
		setBody(`
            <div style="background-image: linear-gradient(red, blue);"></div>
            <div style="background-image: url(&quot;data:image/png;base64,AAAA&quot;);"></div>
            <div style="background-image: url(&quot;https://animex.example/real.jpg&quot;);"></div>
        `);

		expect(animexStrategy.getAnimeMetadata().coverUrl).toBe(
			"https://animex.example/real.jpg",
		);
	});

	it("returns a null cover when the page has no valid background-image", () => {
		setBody("<h1>Show</h1>");

		expect(animexStrategy.getAnimeMetadata().coverUrl).toBeNull();
	});

	it("reads playback progress from a standard <video> element", () => {
		setBody("<video></video>");

		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: 100,
			currentTime: 25,
			paused: false,
		});

		expect(animexStrategy.getProgressStats()).toMatchObject({
			currentMs: 25_000,
			durationMs: 100_000,
			isPaused: false,
		});
	});

	it("falls back to a <video> element nested inside a shadow root", () => {
		setBody("<div id='host'></div>");

		const video = document.createElement("video");

		document
			.getElementById("host")
			?.attachShadow({ mode: "open" })
			.appendChild(video);

		mockVideo(video, {
			duration: 60,
			currentTime: 30,
			paused: true,
		});

		expect(animexStrategy.getProgressStats()).toEqual({
			currentMs: 30_000,
			durationMs: 60_000,
			isPaused: true,
		});
	});

	it("returns zeroed progress stats when shadow root video duration is NaN", () => {
		setBody("<div id='host'></div>");

		const video = document.createElement("video");

		document
			.getElementById("host")
			?.attachShadow({ mode: "open" })
			.appendChild(video);

		mockVideo(video, {
			duration: Number.NaN,
			currentTime: 0,
			paused: true,
		});

		expect(animexStrategy.getProgressStats()).toEqual({
			currentMs: 0,
			durationMs: 0,
			isPaused: null,
		});
	});

	it("returns zeroed progress stats when there is no player at all", () => {
		setBody("<p>nothing</p>");

		expect(animexStrategy.getProgressStats()).toEqual({
			currentMs: 0,
			durationMs: 0,
			isPaused: null,
		});
	});
});
