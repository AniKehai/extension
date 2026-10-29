import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentScriptContext } from "wxt/utils/content-script-context";
import content from "../../src/entrypoints/content";
import { extractMatches } from "../../src/scraper/extractor";
import { strategies } from "../../src/scraper/sites";
import { CHECK_ACTIVITY_INTERVAL } from "../../src/shared/constants";
import { loadFixture, mockVideo, setBody } from "../helpers/dom";

const TICK = CHECK_ACTIVITY_INTERVAL * 1000;

let sendMessage: ReturnType<typeof vi.fn>;

function setRuntimeId(id: string | undefined) {
	Object.defineProperty(browser.runtime, "id", {
		value: id,
		configurable: true,
		writable: true,
	});
}

function injectInto(url: string) {
	(
		window as unknown as { happyDOM: { setURL(u: string): void } }
	).happyDOM.setURL(url);
	const ctx = new ContentScriptContext("content");
	content.main(ctx);
	return ctx;
}

beforeEach(() => {
	vi.useFakeTimers();
	setRuntimeId("test-extension-id");
	sendMessage = vi.fn().mockResolvedValue(undefined);
	vi.spyOn(browser.runtime, "sendMessage").mockImplementation(
		sendMessage as never,
	);
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	(
		window as unknown as { happyDOM: { setURL(u: string): void } }
	).happyDOM.setURL("http://localhost:3000/");
});

describe("content script definition", () => {
	it("matches every supported site and player iframe", () => {
		expect(content.matches).toEqual(extractMatches(strategies));
	});

	it("runs in all frames (players live in iframes)", () => {
		expect(content.allFrames).toBe(true);
	});
});

describe("on an unrelated host", () => {
	it("does nothing (no polling, no messages)", () => {
		injectInto("https://example.com/");
		vi.advanceTimersByTime(TICK * 5);
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("does not match look-alike hosts missing the real domain", () => {
		injectInto("https://hianime-fake.example/");
		vi.advanceTimersByTime(TICK * 2);
		expect(sendMessage).not.toHaveBeenCalled();
	});
});

describe("on a supported site (metadata strategy)", () => {
	it("waits one interval before the first message", () => {
		setBody(loadFixture("hianime/watch.html.fixture"));
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK - 1);
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("sends INFO_UPDATE with the scraped metadata every interval", () => {
		setBody(loadFixture("hianime/watch.html.fixture"));
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith({
			type: "INFO_UPDATE",
			title: "Bocchi the Rock!",
			episode: "Episode 4",
			episodeName: "Four Eyes",
			coverUrl: "https://s4.anilist.co/p/bocchi.jpg",
		});

		vi.advanceTimersByTime(TICK * 2);
		expect(sendMessage).toHaveBeenCalledTimes(3);
	});

	it("strips control characters and trims the scraped metadata", () => {
		const bell = String.fromCharCode(7);
		setBody(
			`<div class="anisc-detail"><div class="film-name"><a>  Boc${bell}chi the Rock!  </a></div></div>` +
				'<div class="server-notice">You are watching <b>Episode 4</b></div>',
		);
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "INFO_UPDATE",
				title: "Bocchi the Rock!",
				episode: "Episode 4",
			}),
		);
	});

	it("drops a cover URL that is not served by a trusted image host", () => {
		setBody(
			'<div class="anisc-poster"><div class="film-poster"><img src="https://evil.example/track.gif"></div></div>' +
				'<div class="anisc-detail"><div class="film-name"><a>Bocchi the Rock!</a></div></div>' +
				'<div class="server-notice">You are watching <b>Episode 4</b></div>',
		);
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "INFO_UPDATE",
				coverUrl: "",
			}),
		);
	});

	it("sends STOPPED when the title is only control characters", () => {
		const bell = String.fromCharCode(7);
		setBody(
			`<div class="anisc-detail"><div class="film-name"><a>${bell}</a></div></div>` +
				'<div class="server-notice">You are watching <b>Episode 4</b></div>',
		);
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith({ type: "STOPPED" });
	});

	it("sends STOPPED when the page has no anime (e.g. user went home)", () => {
		setBody("<div>home page</div>");
		injectInto("https://hianime.at/home");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith({ type: "STOPPED" });
	});

	it("sends STOPPED when only the title or only the episode is present", () => {
		setBody(
			'<div class="anisc-detail"><div class="film-name"><a>Only Title</a></div></div>',
		);
		injectInto("https://hianime.at/watch/x");
		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith({ type: "STOPPED" });
	});

	it("keeps polling after a scraping error, and doesn't throw", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		setBody(loadFixture("hianime/watch.html.fixture"));
		injectInto("https://hianime.at/watch/bocchi");

		sendMessage.mockImplementationOnce(() => {
			throw new Error("extension context invalidated");
		});
		expect(() => vi.advanceTimersByTime(TICK)).not.toThrow();

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledTimes(2);
	});

	it.each([
		["www.miruro.cx", "https://www.miruro.cx/watch/x?ep=1"],
		["kaa.lt", "https://kaa.lt/show/ep-1-abc"],
		["reanime.to", "https://reanime.to/watch/x?ep=1"],
	])("recognises %s", (_host, url) => {
		setBody("<div></div>");
		injectInto(url);
		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalled();
	});
});

describe("inside a player iframe (progress strategy)", () => {
	const mountVideo = (props: Parameters<typeof mockVideo>[1]) => {
		setBody("<video></video>");
		mockVideo(document.querySelector("video") as HTMLVideoElement, props);
	};

	it("sends TIME_UPDATE with the player's position", () => {
		mountVideo({ duration: 1440, currentTime: 60, paused: false });
		injectInto("https://megaplay.buzz/stream/s-2/1");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith({
			type: "TIME_UPDATE",
			currentMs: 60_000,
			durationMs: 1_440_000,
			isPaused: false,
		});
	});

	it("reports isPaused=true when paused", () => {
		mountVideo({ duration: 100, currentTime: 5, paused: true });
		injectInto("https://kwik.cx/e/abc");
		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({ isPaused: true }),
		);
	});

	it("coerces an unknown pause state (null) to true", () => {
		setBody("<div>no player yet</div>");
		injectInto("https://kwik.cx/e/abc");
		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "TIME_UPDATE",
				isPaused: true,
				currentMs: 0,
			}),
		);
	});

	it("never sends INFO_UPDATE/STOPPED from an iframe", () => {
		mountVideo({ duration: 100, currentTime: 5, paused: false });
		injectInto("https://megaplay.buzz/stream");
		vi.advanceTimersByTime(TICK * 3);
		for (const [msg] of sendMessage.mock.calls) {
			expect(msg.type).toBe("TIME_UPDATE");
		}
	});
});

describe("extension reload / update (context invalidation)", () => {
	it("stops polling once the extension context is invalidated", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		setBody(loadFixture("hianime/watch.html.fixture"));
		injectInto("https://hianime.at/watch/bocchi");

		vi.advanceTimersByTime(TICK);
		expect(sendMessage).toHaveBeenCalledTimes(1);

		setRuntimeId(undefined);
		vi.advanceTimersByTime(TICK * 5);

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(error).not.toHaveBeenCalled();
	});

	it("stops polling when the context is invalidated explicitly", () => {
		setBody(loadFixture("hianime/watch.html.fixture"));
		const ctx = injectInto("https://hianime.at/watch/bocchi");

		ctx.notifyInvalidated();
		vi.advanceTimersByTime(TICK * 3);

		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("survives a rejected sendMessage (background restarting) and retries", async () => {
		setBody(loadFixture("hianime/watch.html.fixture"));
		sendMessage.mockRejectedValue(
			new Error(
				"Could not establish connection. Receiving end does not exist.",
			),
		);
		injectInto("https://hianime.at/watch/bocchi");

		await vi.advanceTimersByTimeAsync(TICK);
		await vi.advanceTimersByTimeAsync(TICK);

		expect(sendMessage).toHaveBeenCalledTimes(2);
	});
});
