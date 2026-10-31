import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFixture, setBody, setHead } from "../../helpers/dom";

type Strategy =
	typeof import("../../../src/scraper/sites/voiranime")["voiranimeStrategy"];

let strategy: Strategy;
let sendMessage: ReturnType<typeof vi.fn>;

beforeEach(async () => {
	vi.resetModules();
	sendMessage = vi.fn();
	vi.spyOn(browser.runtime, "sendMessage").mockImplementation(
		sendMessage as never,
	);
	({ voiranimeStrategy: strategy } = await import(
		"../../../src/scraper/sites/voiranime"
	));
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

const page = (title = "One Piece") =>
	loadFixture("voiranime/watch.html.fixture").replace(
		">One Piece<",
		`>${title}<`,
	);

const mount = (html = page()) => {
	const meta = html.match(/<meta[^>]*>/)?.[0] ?? "";
	setHead(meta);
	setBody(html.replace(meta, ""));
	const select = document.querySelector(
		".single-chapter-select",
	) as HTMLSelectElement;
	if (select) {
		const selectedOption = select.querySelector(
			'option[selected="selected"]',
		) as HTMLOptionElement;
		if (selectedOption) {
			selectedOption.selected = true;
		}
	}
};

describe("voiranimeStrategy", () => {
	it("declares its domain and iframe", () => {
		expect(strategy.domains).toEqual(["voir-anime.to"]);
		expect(strategy.iframe_src).toEqual([
			"voembed.net",
			"mfw09.org",
			"voe.sx",
			"streamtape.com",
		]);
	});

	it("scrapes title and episode, coverUrl is initially null (no fallback)", () => {
		sendMessage.mockReturnValue(new Promise(() => {}));
		mount();
		const metadata = strategy.getAnimeMetadata();
		expect(metadata.title).toBe("One Piece");
		expect(metadata.episode).toBe("Episode 1000");
		expect(metadata.coverUrl).toBeNull();
	});

	it("asks the background for the AniList cover exactly once while a fetch is in flight", () => {
		sendMessage.mockReturnValue(new Promise(() => {}));
		mount();
		strategy.getAnimeMetadata();
		strategy.getAnimeMetadata();
		strategy.getAnimeMetadata();

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith({
			type: "FETCH_ANILIST_BY_TITLE",
			title: "One Piece",
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

	it("retries on failed lookup (empty response) up to MAX_RETRIES times", async () => {
		sendMessage.mockResolvedValue({ coverUrl: null });
		mount();
		strategy.getAnimeMetadata();
		await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

		await vi.advanceTimersByTimeAsync(15000);

		expect(sendMessage).toHaveBeenCalledTimes(3);
		expect(strategy.getAnimeMetadata().coverUrl).toBeNull();
	});

	it("retries on rejected message up to MAX_RETRIES times", async () => {
		sendMessage.mockRejectedValue(new Error("no receiver"));
		mount();
		strategy.getAnimeMetadata();
		await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

		await vi.advanceTimersByTimeAsync(15000);

		expect(sendMessage).toHaveBeenCalledTimes(3);
	});

	it("resets the cache and refetches when the title changes", async () => {
		sendMessage.mockResolvedValueOnce({ coverUrl: "https://anilist/one.jpg" });
		mount(page("One Piece"));
		strategy.getAnimeMetadata();
		await vi.waitFor(() =>
			expect(strategy.getAnimeMetadata().coverUrl).toBe(
				"https://anilist/one.jpg",
			),
		);

		sendMessage.mockResolvedValueOnce({ coverUrl: "https://anilist/two.jpg" });
		mount(page("Naruto"));
		expect(strategy.getAnimeMetadata().coverUrl).toBeNull();
		await vi.waitFor(() =>
			expect(strategy.getAnimeMetadata().coverUrl).toBe(
				"https://anilist/two.jpg",
			),
		);
		expect(sendMessage).toHaveBeenCalledTimes(2);
	});

	it("never calls AniList when the page has no title", () => {
		setBody(
			loadFixture("voiranime/watch.html.fixture").replace(
				/<nav class="c-breadcrumb">[\s\S]*<\/nav>/,
				"",
			),
		);
		strategy.getAnimeMetadata();
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("calls AniList even when there is no og:image (tries to get cover)", () => {
		sendMessage.mockResolvedValue({ coverUrl: "https://anilist/cover.jpg" });
		setBody(
			loadFixture("voiranime/watch.html.fixture").replace(
				/<meta property="og:image"[^>]*>/,
				"",
			),
		);
		strategy.getAnimeMetadata();
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith({
			type: "FETCH_ANILIST_BY_TITLE",
			title: "One Piece",
		});
	});
});
