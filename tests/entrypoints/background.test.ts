import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { fetchAnilistCover } from "../../src/core/anilist/api";
import {
	loginWithDiscord,
	processLocalhostRedirect,
} from "../../src/core/discord/auth";
import {
	clearAnimeState,
	currentAnimeState,
	setActivityEnabledFlag,
	setPrivacyEnabledFlag,
} from "../../src/core/state/playback";
import background from "../../src/entrypoints/background";
import { RESET_ACTIVITY_TIMEOUT } from "../../src/shared/constants";

const gateway = vi.hoisted(() => ({
	connect: vi.fn(),
	disconnect: vi.fn(),
	setActivity: vi.fn(),
	isConnected: vi.fn(),
}));

vi.mock("../../src/core/discord/gateway", () => ({
	DiscordGateway: vi.fn(function DiscordGateway() {
		return gateway;
	}),
}));
vi.mock("../../src/core/discord/auth", () => ({
	loginWithDiscord: vi.fn(),
	processLocalhostRedirect: vi.fn(),
}));
vi.mock("../../src/core/anilist/api", () => ({ fetchAnilistCover: vi.fn() }));

const ACTIVE_TAB = { tab: { active: true } };
const BACKGROUND_TAB = { tab: { active: false } };
const AUTH_URL = "http://127.0.0.1/discord-auth?code=abc";

async function dispatch(
	message: Record<string, unknown>,
	sender: object = ACTIVE_TAB,
) {
	const sendResponse = vi.fn();
	const results = await fakeBrowser.runtime.onMessage.trigger(
		message,
		sender,
		sendResponse,
	);
	await vi.advanceTimersByTimeAsync(0);
	return { sendResponse, returned: results[0] };
}

const info = (patch: Record<string, unknown> = {}) => ({
	type: "INFO_UPDATE",
	title: "Frieren",
	episode: "Episode 3",
	episodeName: "Killing Magic",
	coverUrl: "https://cdn/c.jpg",
	...patch,
});
const time = (patch: Record<string, unknown> = {}) => ({
	type: "TIME_UPDATE",
	currentMs: 60_000,
	durationMs: 1_440_000,
	isPaused: false,
	...patch,
});

async function startBackground() {
	background.main();
	await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(1_700_000_000_000);
	clearAnimeState();
	setActivityEnabledFlag(true);
	setPrivacyEnabledFlag(false);

	gateway.connect.mockResolvedValue(undefined);
	gateway.setActivity.mockResolvedValue(undefined);
	gateway.isConnected.mockReturnValue(false);
	vi.mocked(loginWithDiscord).mockReset();
	vi.mocked(processLocalhostRedirect).mockReset();
	vi.mocked(fetchAnilistCover).mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("startup", () => {
	it("connects the gateway immediately", async () => {
		await startBackground();
		expect(gateway.connect).toHaveBeenCalledTimes(1);
	});

	it("restores the persisted activity_enabled and privacy_enabled flags", async () => {
		await browser.storage.local.set({
			activity_enabled: false,
			privacy_enabled: true,
		});
		await startBackground();

		const { sendResponse } = await dispatch({ type: "GET_STATUS" });
		expect(sendResponse).toHaveBeenCalledWith(
			expect.objectContaining({ activityEnabled: false, privacyEnabled: true }),
		);
	});

	it("ignores non-boolean persisted flags", async () => {
		await browser.storage.local.set({
			activity_enabled: "nope",
			privacy_enabled: "yes",
		});
		await startBackground();
		const { sendResponse } = await dispatch({ type: "GET_STATUS" });
		expect(sendResponse).toHaveBeenCalledWith(
			expect.objectContaining({ activityEnabled: true, privacyEnabled: false }),
		);
	});
});

describe("onInstalled", () => {
	it("opens the popup in a tab on first install", async () => {
		await startBackground();
		const create = vi.spyOn(browser.tabs, "create");
		await fakeBrowser.runtime.onInstalled.trigger({ reason: "install" });

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining("popup.html"),
				active: true,
			}),
		);
	});

	it("does not open the popup on update", async () => {
		await startBackground();
		const create = vi.spyOn(browser.tabs, "create");
		await fakeBrowser.runtime.onInstalled.trigger({
			reason: "update",
			previousVersion: "1.0.0",
		});
		expect(create).not.toHaveBeenCalled();
	});
});

describe("content script re-injection after install/update", () => {
	const MANIFEST = {
		content_scripts: [
			{
				matches: ["https://hianime.at/*", "https://kwik.cx/*"],
				js: ["content-scripts/content.js"],
				all_frames: true,
			},
		],
	};
	let executeScript: ReturnType<typeof vi.fn>;

	const define = (target: object, key: string, value: unknown) =>
		Object.defineProperty(target, key, {
			value,
			configurable: true,
			writable: true,
		});

	const trigger = async (details: { reason: string }) => {
		await fakeBrowser.runtime.onInstalled.trigger(details as never);
		await vi.advanceTimersByTimeAsync(0);
	};

	beforeEach(async () => {
		define(browser.runtime, "getManifest", () => MANIFEST);
		executeScript = vi.fn().mockResolvedValue([]);
		define(browser, "scripting", { executeScript });
		vi.spyOn(browser.tabs, "query").mockResolvedValue([
			{ id: 7, url: "https://hianime.at/watch/a" },
			{ id: 9, url: "https://kwik.cx/e/b" },
			{ url: "https://hianime.at/no-id" },
		] as never);
		await startBackground();
	});

	it("injects the content script into matching open tabs on update", async () => {
		await trigger({ reason: "update" });

		expect(browser.tabs.query).toHaveBeenCalledWith({
			url: MANIFEST.content_scripts[0]?.matches,
		});
		expect(executeScript).toHaveBeenCalledTimes(2);
		expect(executeScript).toHaveBeenCalledWith({
			target: { tabId: 7, allFrames: true },
			files: ["content-scripts/content.js"],
		});
		expect(executeScript).toHaveBeenCalledWith({
			target: { tabId: 9, allFrames: true },
			files: ["content-scripts/content.js"],
		});
	});

	it("also injects on first install", async () => {
		await trigger({ reason: "install" });
		expect(executeScript).toHaveBeenCalledTimes(2);
	});

	it("does nothing for other reasons (e.g. browser update)", async () => {
		await trigger({ reason: "chrome_update" });
		expect(browser.tabs.query).not.toHaveBeenCalled();
		expect(executeScript).not.toHaveBeenCalled();
	});

	it("keeps going when injecting into one tab fails", async () => {
		executeScript.mockRejectedValueOnce(new Error("Cannot access contents"));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		await trigger({ reason: "update" });

		expect(executeScript).toHaveBeenCalledTimes(2);
	});

	it("skips content scripts that have no files or no match patterns", async () => {
		define(browser.runtime, "getManifest", () => ({
			content_scripts: [
				{ matches: ["https://hianime.at/*"] },
				{ js: ["a.js"] },
			],
		}));

		await trigger({ reason: "update" });

		expect(browser.tabs.query).not.toHaveBeenCalled();
		expect(executeScript).not.toHaveBeenCalled();
	});

	it("handles a manifest with no content_scripts", async () => {
		define(browser.runtime, "getManifest", () => ({}));
		await trigger({ reason: "update" });
		expect(executeScript).not.toHaveBeenCalled();
	});
});

describe("OAuth redirect interception (mobile flow)", () => {
	beforeEach(async () => {
		await startBackground();
		vi.spyOn(browser.tabs, "remove").mockResolvedValue(undefined);
	});

	it("closes the redirect tab and ignores unrelated URLs", async () => {
		await fakeBrowser.tabs.onUpdated.trigger(
			1,
			{ url: "https://example.com" },
			{ url: "https://example.com" } as never,
		);
		expect(browser.tabs.remove).not.toHaveBeenCalled();
		expect(processLocalhostRedirect).not.toHaveBeenCalled();
	});

	it("on success: clears auth_error and reconnects the gateway", async () => {
		await browser.storage.local.set({ auth_error: "old" });
		gateway.connect.mockClear();
		vi.mocked(processLocalhostRedirect).mockResolvedValue({
			success: true,
			token: "t",
		});

		await fakeBrowser.tabs.onUpdated.trigger(7, { url: AUTH_URL }, {} as never);
		await vi.advanceTimersByTimeAsync(0);

		expect(browser.tabs.remove).toHaveBeenCalledWith(7);
		expect(processLocalhostRedirect).toHaveBeenCalledWith(AUTH_URL);
		expect(
			(await browser.storage.local.get("auth_error")).auth_error,
		).toBeUndefined();
		expect(gateway.connect).toHaveBeenCalledTimes(1);
	});

	it("on failure: stores the error for the popup and does not connect", async () => {
		gateway.connect.mockClear();
		vi.mocked(processLocalhostRedirect).mockResolvedValue({
			success: false,
			error: "denied",
		});

		await fakeBrowser.tabs.onUpdated.trigger(7, {}, { url: AUTH_URL } as never);
		await vi.advanceTimersByTimeAsync(0);

		expect((await browser.storage.local.get("auth_error")).auth_error).toBe(
			"denied",
		);
		expect(gateway.connect).not.toHaveBeenCalled();
	});

	it("falls back to tab.url when changeInfo has no url", async () => {
		vi.mocked(processLocalhostRedirect).mockResolvedValue({
			success: false,
			error: "e",
		});
		await fakeBrowser.tabs.onUpdated.trigger(1, {}, { url: AUTH_URL } as never);
		expect(processLocalhostRedirect).toHaveBeenCalledWith(AUTH_URL);
	});
});

describe("token removal (expired session)", () => {
	beforeEach(startBackground);

	const changeToken = (oldValue?: string, newValue?: string, area = "local") =>
		fakeBrowser.storage.onChanged.trigger(
			{ discord_token: { oldValue, newValue } },
			area,
		);

	it("opens the popup via action.openPopup when available", async () => {
		const openPopup = vi.fn().mockResolvedValue(undefined);
		(browser as unknown as { action: unknown }).action = { openPopup };
		await changeToken("tok", undefined);
		expect(openPopup).toHaveBeenCalled();
	});

	it("falls back to a tab when openPopup is blocked", async () => {
		const openPopup = vi.fn().mockRejectedValue(new Error("blocked"));
		(browser as unknown as { action: unknown }).action = { openPopup };
		const create = vi.spyOn(browser.tabs, "create");

		await changeToken("tok", undefined);
		await vi.advanceTimersByTimeAsync(0);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ active: true }),
		);
	});

	it("opens a tab when action.openPopup doesn't exist (Firefox Android)", async () => {
		(browser as unknown as { action: unknown }).action = {};
		const create = vi.spyOn(browser.tabs, "create");
		await changeToken("tok", undefined);
		expect(create).toHaveBeenCalled();
	});

	it("does nothing when a token is first stored (login)", async () => {
		const create = vi.spyOn(browser.tabs, "create");
		await changeToken(undefined, "new");
		expect(create).not.toHaveBeenCalled();
	});

	it("does nothing when the token is replaced", async () => {
		const create = vi.spyOn(browser.tabs, "create");
		await changeToken("old", "new");
		expect(create).not.toHaveBeenCalled();
	});

	it("ignores changes in other storage areas", async () => {
		const create = vi.spyOn(browser.tabs, "create");
		await changeToken("tok", undefined, "sync");
		expect(create).not.toHaveBeenCalled();
	});
});

describe("LOGIN_DISCORD", () => {
	beforeEach(startBackground);

	it("success: connects the gateway and replies success", async () => {
		vi.mocked(loginWithDiscord).mockResolvedValue({ status: "token" });
		gateway.connect.mockClear();

		const { sendResponse, returned } = await dispatch({
			type: "LOGIN_DISCORD",
		});
		expect(returned).toBe(true);
		expect(gateway.connect).toHaveBeenCalledTimes(1);
		expect(sendResponse).toHaveBeenCalledWith({ status: "token" });
	});

	it("mobile: replies pending without connecting", async () => {
		vi.mocked(loginWithDiscord).mockResolvedValue({ status: "pending" });
		gateway.connect.mockClear();

		const { sendResponse } = await dispatch({ type: "LOGIN_DISCORD" });
		expect(sendResponse).toHaveBeenCalledWith({ status: "pending" });
		expect(gateway.connect).not.toHaveBeenCalled();
	});

	it("failure: replies with a failure message", async () => {
		vi.mocked(loginWithDiscord).mockResolvedValue({
			status: "failed",
			error: "Denied",
		});
		const { sendResponse } = await dispatch({ type: "LOGIN_DISCORD" });
		expect(sendResponse).toHaveBeenCalledWith({
			status: "failed",
			error: "Denied",
		});
	});

	it("exception: replies with the error message", async () => {
		vi.mocked(loginWithDiscord).mockRejectedValue(new Error("kaboom"));
		const { sendResponse } = await dispatch({ type: "LOGIN_DISCORD" });
		expect(sendResponse).toHaveBeenCalledWith({
			status: "failed",
			error: "kaboom",
		});
	});

	it("clears any previous auth_error first", async () => {
		await browser.storage.local.set({ auth_error: "stale" });
		vi.mocked(loginWithDiscord).mockResolvedValue({
			status: "failed",
			error: "failed",
		});
		await dispatch({ type: "LOGIN_DISCORD" });
		expect(
			(await browser.storage.local.get("auth_error")).auth_error,
		).toBeUndefined();
	});
});

describe("SET_ACTIVITY_ENABLED", () => {
	beforeEach(startBackground);

	it("persists the new value and replies", async () => {
		const { sendResponse } = await dispatch({
			type: "SET_ACTIVITY_ENABLED",
			enabled: false,
		});
		expect(
			(await browser.storage.local.get("activity_enabled")).activity_enabled,
		).toBe(false);
		expect(sendResponse).toHaveBeenCalledWith({ success: true });
	});

	it("disabling clears Discord presence (STOPPED) and local state", async () => {
		await dispatch(info());
		gateway.setActivity.mockClear();

		await dispatch({ type: "SET_ACTIVITY_ENABLED", enabled: false });

		expect(gateway.setActivity).toHaveBeenCalledWith(
			expect.objectContaining({ type: "STOPPED" }),
		);
		expect(currentAnimeState.title).toBe(null);
	});

	it("disabling cancels the idle timeout (no second STOPPED later)", async () => {
		await dispatch(info());
		await dispatch({ type: "SET_ACTIVITY_ENABLED", enabled: false });
		gateway.setActivity.mockClear();

		await vi.advanceTimersByTimeAsync(RESET_ACTIVITY_TIMEOUT * 1000 * 2);
		expect(gateway.setActivity).not.toHaveBeenCalled();
	});

	it("enabling does not send STOPPED", async () => {
		await dispatch({ type: "SET_ACTIVITY_ENABLED", enabled: false });
		gateway.setActivity.mockClear();
		await dispatch({ type: "SET_ACTIVITY_ENABLED", enabled: true });
		expect(gateway.setActivity).not.toHaveBeenCalled();
	});
});

describe("SET_PRIVACY_ENABLED", () => {
	beforeEach(startBackground);

	it("persists the new value and replies", async () => {
		const { sendResponse } = await dispatch({
			type: "SET_PRIVACY_ENABLED",
			enabled: true,
		});
		expect(
			(await browser.storage.local.get("privacy_enabled")).privacy_enabled,
		).toBe(true);
		expect(sendResponse).toHaveBeenCalledWith({ success: true });
	});

	it("updates active presence to a private session when enabled", async () => {
		await dispatch(info());
		gateway.setActivity.mockClear();

		await dispatch({ type: "SET_PRIVACY_ENABLED", enabled: true });

		expect(gateway.setActivity).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "WATCHING",
				title: "Anime",
				episode: "Private Session",
				coverUrl: "",
			}),
		);
	});

	it("restores active presence when disabled", async () => {
		await dispatch(info());
		await dispatch({ type: "SET_PRIVACY_ENABLED", enabled: true });
		gateway.setActivity.mockClear();

		await dispatch({ type: "SET_PRIVACY_ENABLED", enabled: false });

		expect(gateway.setActivity).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "WATCHING",
				title: "Frieren",
				episode: "Episode 3",
			}),
		);
	});

	it("does not send presence updates if no anime is tracked", async () => {
		await dispatch({ type: "SET_PRIVACY_ENABLED", enabled: true });
		expect(gateway.setActivity).not.toHaveBeenCalled();
	});
});

describe("GET_STATUS", () => {
	beforeEach(startBackground);

	it("reports a logged-out idle state", async () => {
		const { sendResponse, returned } = await dispatch({ type: "GET_STATUS" });
		expect(returned).toBe(true);
		expect(sendResponse).toHaveBeenCalledWith({
			hasToken: false,
			isGatewayReady: false,
			activityEnabled: true,
			privacyEnabled: false,
			authError: null,
			currentAnime: null,
		});
	});

	it("reports token, gateway readiness and auth error", async () => {
		await browser.storage.local.set({
			discord_token: "tok",
			auth_error: "boom",
		});
		gateway.isConnected.mockReturnValue(true);

		const { sendResponse } = await dispatch({ type: "GET_STATUS" });
		expect(sendResponse).toHaveBeenCalledWith(
			expect.objectContaining({
				hasToken: true,
				isGatewayReady: true,
				authError: "boom",
			}),
		);
	});

	it("treats an empty token as logged out", async () => {
		await browser.storage.local.set({ discord_token: "" });
		const { sendResponse } = await dispatch({ type: "GET_STATUS" });
		expect(sendResponse).toHaveBeenCalledWith(
			expect.objectContaining({ hasToken: false }),
		);
	});

	it("is answered even when the sender is not an active tab (popup has no tab)", async () => {
		const { sendResponse } = await dispatch({ type: "GET_STATUS" }, {});
		expect(sendResponse).toHaveBeenCalled();
	});

	it("includes the anime currently being tracked", async () => {
		await dispatch(info());
		const { sendResponse } = await dispatch({ type: "GET_STATUS" });
		expect(sendResponse.mock.calls[0]?.[0].currentAnime).toMatchObject({
			title: "Frieren",
			episode: "Episode 3",
		});
	});
});

describe("messages from content scripts", () => {
	beforeEach(startBackground);

	it("ignores messages from background (inactive) tabs", async () => {
		await dispatch(info(), BACKGROUND_TAB);
		expect(currentAnimeState.title).toBe(null);
		expect(gateway.setActivity).not.toHaveBeenCalled();
	});

	it("ignores messages without a tab", async () => {
		await dispatch(info(), {});
		expect(currentAnimeState.title).toBe(null);
	});

	it("ignores unknown message types", async () => {
		const { sendResponse, returned } = await dispatch({ type: "WHATEVER" });
		expect(returned).toBeUndefined();
		expect(sendResponse).not.toHaveBeenCalled();
		expect(gateway.setActivity).not.toHaveBeenCalled();
	});

	describe("FETCH_ANILIST", () => {
		it("looks up the cover and replies with it", async () => {
			vi.mocked(fetchAnilistCover).mockResolvedValue("https://anilist/c.jpg");
			const { sendResponse, returned } = await dispatch({
				type: "FETCH_ANILIST",
				anilistId: 99,
			});

			expect(returned).toBe(true);
			expect(fetchAnilistCover).toHaveBeenCalledWith(99);
			expect(sendResponse).toHaveBeenCalledWith({
				coverUrl: "https://anilist/c.jpg",
			});
		});

		it("replies with a null cover when nothing is found", async () => {
			vi.mocked(fetchAnilistCover).mockResolvedValue(null);
			const { sendResponse } = await dispatch({
				type: "FETCH_ANILIST",
				anilistId: 1,
			});
			expect(sendResponse).toHaveBeenCalledWith({ coverUrl: null });
		});

		it("is ignored from inactive tabs", async () => {
			await dispatch({ type: "FETCH_ANILIST", anilistId: 1 }, BACKGROUND_TAB);
			expect(fetchAnilistCover).not.toHaveBeenCalled();
		});
	});

	describe("INFO_UPDATE / TIME_UPDATE", () => {
		it("stores the info and broadcasts WATCHING", async () => {
			await dispatch(info());

			expect(currentAnimeState).toMatchObject({
				title: "Frieren",
				episode: "Episode 3",
				episodeName: "Killing Magic",
				coverUrl: "https://cdn/c.jpg",
			});
			expect(gateway.setActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "WATCHING",
					title: "Frieren",
					episode: "Episode 3",
				}),
			);
		});

		it("broadcasts masked metadata when privacy is enabled", async () => {
			await dispatch({ type: "SET_PRIVACY_ENABLED", enabled: true });
			gateway.setActivity.mockClear();

			await dispatch(info());

			expect(gateway.setActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "WATCHING",
					title: "Anime",
					episode: "Private Session",
					coverUrl: "",
					currentMs: 0,
					durationMs: 0,
				}),
			);
			// local state remains intact
			expect(currentAnimeState.title).toBe("Frieren");
		});

		it("broadcasts PAUSED when the player is paused", async () => {
			await dispatch(info());
			await dispatch(time({ isPaused: true }));
			expect(gateway.setActivity).toHaveBeenLastCalledWith(
				expect.objectContaining({ type: "PAUSED", isPaused: true }),
			);
		});

		it("stores playback position from TIME_UPDATE", async () => {
			await dispatch(time({ currentMs: 12_345, durationMs: 99_000 }));
			expect(currentAnimeState).toMatchObject({
				currentMs: 12_345,
				durationMs: 99_000,
			});
		});

		it("throttles: identical consecutive updates broadcast only once", async () => {
			await dispatch(info());
			await dispatch(info());
			await dispatch(info());
			expect(gateway.setActivity).toHaveBeenCalledTimes(1);
		});

		it("re-broadcasts when the episode changes", async () => {
			await dispatch(info());
			await dispatch(info({ episode: "Episode 4" }));
			expect(gateway.setActivity).toHaveBeenCalledTimes(2);
		});

		it("re-broadcasts when the user seeks", async () => {
			await dispatch(info());
			await dispatch(time({ currentMs: 10_000 }));
			gateway.setActivity.mockClear();
			await dispatch(time({ currentMs: 900_000 }));
			expect(gateway.setActivity).toHaveBeenCalledTimes(1);
		});

		it("updates local state but does NOT broadcast while sharing is disabled", async () => {
			setActivityEnabledFlag(false);
			await dispatch(info());

			expect(currentAnimeState.title).toBe("Frieren");
			expect(gateway.setActivity).not.toHaveBeenCalled();
		});

		it("survives gateway errors (logged, not thrown)", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			gateway.setActivity.mockRejectedValue(new Error("socket closed"));
			await expect(dispatch(info())).resolves.toBeDefined();
		});
	});

	describe("STOPPED", () => {
		it("clears presence and local state", async () => {
			await dispatch(info());
			gateway.setActivity.mockClear();

			await dispatch({ type: "STOPPED" });

			expect(gateway.setActivity).toHaveBeenCalledWith(
				expect.objectContaining({ type: "STOPPED" }),
			);
			expect(currentAnimeState.title).toBe(null);
		});

		it("cancels the idle timeout", async () => {
			await dispatch(info());
			await dispatch({ type: "STOPPED" });
			gateway.setActivity.mockClear();

			await vi.advanceTimersByTimeAsync(RESET_ACTIVITY_TIMEOUT * 1000 * 2);
			expect(gateway.setActivity).not.toHaveBeenCalled();
		});

		it("after STOPPED, the next INFO_UPDATE broadcasts again", async () => {
			await dispatch(info());
			await dispatch({ type: "STOPPED" });
			gateway.setActivity.mockClear();
			await dispatch(info());
			expect(gateway.setActivity).toHaveBeenCalledTimes(1);
		});
	});

	describe("idle timeout", () => {
		it(`clears presence after ${RESET_ACTIVITY_TIMEOUT}s without updates (tab closed/crashed)`, async () => {
			await dispatch(info());
			gateway.setActivity.mockClear();

			await vi.advanceTimersByTimeAsync(RESET_ACTIVITY_TIMEOUT * 1000 - 1);
			expect(gateway.setActivity).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			expect(gateway.setActivity).toHaveBeenCalledWith(
				expect.objectContaining({ type: "STOPPED" }),
			);
			expect(currentAnimeState.title).toBe(null);
		});

		it("is pushed back by every heartbeat update", async () => {
			await dispatch(info());
			gateway.setActivity.mockClear();

			for (let i = 0; i < 5; i++) {
				await vi.advanceTimersByTimeAsync(5_000);
				await dispatch(time({ currentMs: 60_000 + (i + 1) * 5_000 }));
			}
			expect(gateway.setActivity).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: "STOPPED" }),
			);
		});

		it("is not armed while sharing is disabled", async () => {
			setActivityEnabledFlag(false);
			await dispatch(info());
			await vi.advanceTimersByTimeAsync(RESET_ACTIVITY_TIMEOUT * 1000 * 2);
			expect(gateway.setActivity).not.toHaveBeenCalled();
		});
	});
});

describe("LOGOUT_DISCORD", () => {
	it("disconnects the gateway, deletes the token and replies without re-auth prompt", async () => {
		await startBackground();
		await browser.storage.local.set({ discord_token: "tok" });
		const create = vi.spyOn(browser.tabs, "create");

		const { sendResponse, returned } = await dispatch({
			type: "LOGOUT_DISCORD",
		});

		expect(returned).toBe(true);
		expect(gateway.disconnect).toHaveBeenCalledTimes(1);
		expect(
			(await browser.storage.local.get("discord_token")).discord_token,
		).toBeUndefined();
		expect(sendResponse).toHaveBeenCalledWith({ success: true });
		expect(create).not.toHaveBeenCalled();
	});

	it("clears presence (STOPPED) and state before disconnecting if watching", async () => {
		await startBackground();
		await dispatch(info()); // start watching
		gateway.setActivity.mockClear();

		await dispatch({ type: "LOGOUT_DISCORD" });

		expect(gateway.setActivity).toHaveBeenCalledWith(
			expect.objectContaining({ type: "STOPPED" }),
		);
		expect(currentAnimeState.title).toBe(null);
		expect(gateway.disconnect).toHaveBeenCalledTimes(1);
	});
});
