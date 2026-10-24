import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFixture, setBody, setHead } from "../../helpers/dom";

type Strategy =
	typeof import("../../../src/scraper/sites/animepahe")["animepaheStrategy"];

let strategy: Strategy;
let sendMessage: ReturnType<typeof vi.fn>;

beforeEach(async () => {
	vi.resetModules();
	sendMessage = vi.fn();
	vi.spyOn(browser.runtime, "sendMessage").mockImplementation(
		sendMessage as never,
	);
	({ animepaheStrategy: strategy } = await import(
		"../../../src/scraper/sites/animepahe"
	));
});

const page = (id = "154587") =>
	loadFixture("animepahe/watch.html.fixture").replace(
		'content="154587"',
		`content="${id}"`,
	);

const mount = (html = page()) => {
	const meta = html.match(/<meta[^>]*>/)?.[0] ?? "";
	setHead(meta);
	setBody(html.replace(meta, ""));
};

describe("animepaheStrategy", () => {
	it("declares its domain and iframe", () => {
		expect(strategy.domains).toEqual(["animepahe.pw"]);
		expect(strategy.iframe_src).toEqual(["kwik.cx"]);
	});

	it("scrapes title, episode and the (protected) poster URL from the DOM", () => {
		sendMessage.mockReturnValue(new Promise(() => {})); // never resolves
		mount();
		expect(strategy.getAnimeMetadata()).toEqual({
			title: "Sousou no Frieren",
			episode: "Episode 12",
			coverUrl: "https://animepahe.example/protected.jpg",
		});
	});

	it("asks the background for the AniList cover exactly once while a fetch is in flight", () => {
		sendMessage.mockReturnValue(new Promise(() => {}));
		mount();
		strategy.getAnimeMetadata();
		strategy.getAnimeMetadata();
		strategy.getAnimeMetadata();

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith({
			type: "FETCH_ANILIST",
			anilistId: 154587,
		});
	});

	it("swaps in the AniList cover once it arrives and then stops fetching", async () => {
		sendMessage.mockResolvedValue({ coverUrl: "https://anilist/cover.jpg" });
		mount();
		strategy.getAnimeMetadata();

		await vi.waitFor(() =>
			expect(strategy.getAnimeMetadata().coverUrl).toBe(
				"https://anilist/cover.jpg",
			),
		);
		expect(sendMessage).toHaveBeenCalledTimes(1);
	});

	it("does not retry after a failed lookup (empty response)", async () => {
		sendMessage.mockResolvedValue({ coverUrl: null });
		mount();
		strategy.getAnimeMetadata();
		await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
		await Promise.resolve();

		strategy.getAnimeMetadata();
		strategy.getAnimeMetadata();
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(strategy.getAnimeMetadata().coverUrl).toBe(
			"https://animepahe.example/protected.jpg",
		);
	});

	it("does not retry after a rejected message either", async () => {
		sendMessage.mockRejectedValue(new Error("no receiver"));
		mount();
		strategy.getAnimeMetadata();
		await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
		await new Promise((r) => setTimeout(r, 0));

		strategy.getAnimeMetadata();
		expect(sendMessage).toHaveBeenCalledTimes(1);
	});

	it("resets the cache and refetches when the AniList id changes", async () => {
		sendMessage.mockResolvedValueOnce({ coverUrl: "https://anilist/one.jpg" });
		mount(page("1"));
		strategy.getAnimeMetadata();
		await vi.waitFor(() =>
			expect(strategy.getAnimeMetadata().coverUrl).toBe(
				"https://anilist/one.jpg",
			),
		);

		sendMessage.mockResolvedValueOnce({ coverUrl: "https://anilist/two.jpg" });
		mount(page("2"));
		expect(strategy.getAnimeMetadata().coverUrl).toBe(
			"https://animepahe.example/protected.jpg",
		);
		await vi.waitFor(() =>
			expect(strategy.getAnimeMetadata().coverUrl).toBe(
				"https://anilist/two.jpg",
			),
		);
		expect(sendMessage).toHaveBeenCalledTimes(2);
	});

	it("never calls AniList when the page has no anilist meta tag", () => {
		setBody(
			loadFixture("animepahe/watch.html.fixture").replace(/<meta[^>]*>/, ""),
		);
		strategy.getAnimeMetadata();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("ignores a non-numeric anilist meta value", () => {
		mount(page("not-a-number"));
		strategy.getAnimeMetadata();
		expect(sendMessage).not.toHaveBeenCalled();
	});
});
