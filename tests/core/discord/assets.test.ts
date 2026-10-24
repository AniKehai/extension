import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_ID } from "../../../src/shared/constants";

type Assets = typeof import("../../../src/core/discord/assets");
let assets: Assets;
let fetchMock: ReturnType<typeof vi.fn>;

const LIST_URL = `https://discord.com/api/v10/oauth2/applications/${APPLICATION_ID}/assets`;
const EXTERNAL_URL = `https://discord.com/api/v10/applications/${APPLICATION_ID}/external-assets`;

const res = (opts: {
	ok?: boolean;
	status?: number;
	json?: unknown;
	text?: string;
}) => ({
	ok: opts.ok ?? true,
	status: opts.status ?? 200,
	json: async () => opts.json,
	text: async () => opts.text ?? "",
});

const route = (handlers: Record<string, () => unknown>) =>
	fetchMock.mockImplementation(async (url: string) => {
		const handler = handlers[url];
		if (!handler) throw new Error(`Unexpected fetch: ${url}`);
		return handler();
	});

const ASSET_LIST = [
	{ id: "111", name: "default_cover" },
	{ id: "222", name: "play" },
	{ id: "333", name: "pause" },
];

beforeEach(async () => {
	vi.resetModules();
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	assets = await import("../../../src/core/discord/assets");
});

describe("getAppAssetId", () => {
	it("looks up an asset id by name", async () => {
		route({ [LIST_URL]: () => res({ json: ASSET_LIST }) });
		await expect(assets.getAppAssetId("play")).resolves.toBe("222");
	});

	it("returns undefined for an unknown asset name", async () => {
		route({ [LIST_URL]: () => res({ json: ASSET_LIST }) });
		await expect(assets.getAppAssetId("nope")).resolves.toBeUndefined();
	});

	it("fetches the asset list only once, then serves from memory", async () => {
		route({ [LIST_URL]: () => res({ json: ASSET_LIST }) });
		await assets.getAppAssetId("play");
		await assets.getAppAssetId("pause");
		await assets.getAppAssetId("default_cover");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns undefined on an HTTP error and retries next time (no poisoned cache)", async () => {
		route({ [LIST_URL]: () => res({ ok: false, status: 500, text: "boom" }) });
		await expect(assets.getAppAssetId("play")).resolves.toBeUndefined();

		route({ [LIST_URL]: () => res({ json: ASSET_LIST }) });
		await expect(assets.getAppAssetId("play")).resolves.toBe("222");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("returns undefined when the network throws", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		await expect(assets.getAppAssetId("play")).resolves.toBeUndefined();
	});
});

describe("getLargeImageKey", () => {
	const COVER = "https://cdn.example/cover.jpg";

	beforeEach(async () => {
		await browser.storage.local.set({ discord_token: "tok_123" });
	});

	it("registers the cover as an external asset and returns the mp: key", async () => {
		route({
			[EXTERNAL_URL]: () =>
				res({ json: [{ external_asset_path: "external/abc/cover.jpg" }] }),
		});

		await expect(assets.getLargeImageKey(COVER)).resolves.toBe(
			"mp:external/abc/cover.jpg",
		);

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe("POST");
		expect(init.headers).toMatchObject({
			Authorization: "Bearer tok_123",
			"Content-Type": "application/json",
		});
		expect(JSON.parse(init.body as string)).toEqual({ urls: [COVER] });
	});

	it("caches per cover URL (second call makes no request)", async () => {
		route({
			[EXTERNAL_URL]: () => res({ json: [{ external_asset_path: "p/1" }] }),
		});
		await assets.getLargeImageKey(COVER);
		await assets.getLargeImageKey(COVER);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("registers different covers separately", async () => {
		let n = 0;
		route({
			[EXTERNAL_URL]: () =>
				res({ json: [{ external_asset_path: `p/${++n}` }] }),
		});
		await expect(assets.getLargeImageKey("https://a/1.jpg")).resolves.toBe(
			"mp:p/1",
		);
		await expect(assets.getLargeImageKey("https://a/2.jpg")).resolves.toBe(
			"mp:p/2",
		);
	});

	it("falls back to the app's default_cover when registration fails (HTTP error)", async () => {
		route({
			[EXTERNAL_URL]: () =>
				res({ ok: false, status: 401, text: "unauthorized" }),
			[LIST_URL]: () => res({ json: ASSET_LIST }),
		});
		await expect(assets.getLargeImageKey(COVER)).resolves.toBe("111");
	});

	it("falls back to default_cover when Discord returns no asset path", async () => {
		route({
			[EXTERNAL_URL]: () => res({ json: [] }),
			[LIST_URL]: () => res({ json: ASSET_LIST }),
		});
		await expect(assets.getLargeImageKey(COVER)).resolves.toBe("111");
	});

	it("does not cache a failed registration (retries next time)", async () => {
		route({
			[EXTERNAL_URL]: () => res({ ok: false, status: 500 }),
			[LIST_URL]: () => res({ json: ASSET_LIST }),
		});
		await assets.getLargeImageKey(COVER);

		route({
			[EXTERNAL_URL]: () => res({ json: [{ external_asset_path: "ok" }] }),
		});
		await expect(assets.getLargeImageKey(COVER)).resolves.toBe("mp:ok");
	});
});
