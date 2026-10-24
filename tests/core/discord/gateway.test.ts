import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAppAssetId,
	getLargeImageKey,
} from "../../../src/core/discord/assets";
import { DiscordGateway } from "../../../src/core/discord/gateway";
import { APPLICATION_ID } from "../../../src/shared/constants";
import { FakeWebSocket } from "../../helpers/fake-websocket";

vi.mock("../../../src/core/discord/assets", () => ({
	getLargeImageKey: vi.fn(),
	getAppAssetId: vi.fn(),
}));

const NOW = 1_700_000_000_000;
const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

let gateway: DiscordGateway;

async function connectAndReady(g = gateway) {
	await g.connect();
	const ws = FakeWebSocket.last;
	ws.serverOpen();
	ws.serverSend({ op: 10, d: { heartbeat_interval: 41_250 } });
	ws.serverSend({ op: 0, t: "READY", d: {} });
	return ws;
}

const watching = (patch: Record<string, unknown> = {}) => ({
	type: "WATCHING" as const,
	title: "Frieren",
	episode: "Episode 3",
	episodeName: "Killing Magic",
	coverUrl: "https://cdn/cover.jpg",
	currentMs: 60_000,
	durationMs: 1_440_000,
	isPaused: false,
	...patch,
});

beforeEach(async () => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	FakeWebSocket.install();
	await browser.storage.local.set({ discord_token: "tok_123" });
	gateway = new DiscordGateway();

	vi.mocked(getLargeImageKey).mockResolvedValue("mp:external/cover");
	vi.mocked(getAppAssetId).mockImplementation(
		async (name: string) => `asset:${name}`,
	);
});

afterEach(() => {
	gateway.disconnect();
	vi.useRealTimers();
});

describe("connect", () => {
	it("opens a socket to the Discord gateway", async () => {
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(1);
		expect(FakeWebSocket.last.url).toBe(GATEWAY_URL);
	});

	it("does nothing without a stored token", async () => {
		await browser.storage.local.remove("discord_token");
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(0);
	});

	it("ignores a non-string token", async () => {
		await browser.storage.local.set({ discord_token: 12345 });
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(0);
	});

	it("does not open a second socket while one is connecting", async () => {
		await gateway.connect();
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("does not open a second socket while one is open", async () => {
		await connectAndReady();
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("is not 'connected' until READY arrives", async () => {
		await gateway.connect();
		FakeWebSocket.last.serverOpen();
		expect(gateway.isConnected()).toBe(false);

		FakeWebSocket.last.serverSend({ op: 10, d: { heartbeat_interval: 1000 } });
		expect(gateway.isConnected()).toBe(false);

		FakeWebSocket.last.serverSend({ op: 0, t: "READY", d: {} });
		expect(gateway.isConnected()).toBe(true);
	});
});

describe("handshake", () => {
	it("answers HELLO (op 10) with IDENTIFY (op 2) using the Bearer token", async () => {
		const ws = await connectAndReady();
		const identify = ws.sentPayloads.find((p) => p.op === 2);

		expect(identify?.d.token).toBe("Bearer tok_123");
		expect(identify?.d.properties).toMatchObject({
			$device: "pc",
			$browser: import.meta.env.BROWSER || "chrome",
		});
	});

	describe("OS detection (properties.$os)", () => {
		const os = async (ua: string) => {
			vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
			const g = new DiscordGateway();
			const ws = await connectAndReady(g);
			g.disconnect();
			return ws.sentPayloads.find((p) => p.op === 2)?.d.properties.$os;
		};

		it("Windows (default)", async () => {
			await expect(
				os("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130"),
			).resolves.toBe("windows");
		});
		it("macOS", async () => {
			await expect(
				os("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605"),
			).resolves.toBe("macos");
		});
		it("Linux", async () => {
			await expect(
				os("Mozilla/5.0 (X11; Linux x86_64) Firefox/142.0"),
			).resolves.toBe("linux");
		});

		it("Android (Kiwi/Lemur)", async () => {
			await expect(
				os("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile"),
			).resolves.toBe("android");
		});

		it("iPhone", async () => {
			await expect(
				os("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari"),
			).resolves.toBe("ios");
		});
	});

	it("sends heartbeats (op 1) at the server-provided interval", async () => {
		const ws = await connectAndReady();
		const heartbeats = () => ws.sentPayloads.filter((p) => p.op === 1);

		expect(heartbeats()).toHaveLength(0);
		vi.advanceTimersByTime(41_250);
		expect(heartbeats()).toHaveLength(1);
		expect(heartbeats()[0]).toEqual({ op: 1, d: null });

		vi.advanceTimersByTime(41_250 * 2);
		expect(heartbeats()).toHaveLength(3);
	});

	it("does not send a heartbeat while the socket isn't OPEN", async () => {
		const ws = await connectAndReady();
		ws.readyState = FakeWebSocket.CLOSING;
		vi.advanceTimersByTime(41_250);
		expect(ws.sentPayloads.filter((p) => p.op === 1)).toHaveLength(0);
	});

	it("replaces (not stacks) the heartbeat timer if HELLO arrives twice", async () => {
		const ws = await connectAndReady();
		ws.serverSend({ op: 10, d: { heartbeat_interval: 10_000 } });
		ws.sent.length = 0;

		vi.advanceTimersByTime(10_000);
		expect(ws.sentPayloads.filter((p) => p.op === 1)).toHaveLength(1);
	});

	it("tracks the sequence number 's' and sends it in heartbeats", async () => {
		const ws = await connectAndReady();
		ws.serverSend({ op: 0, t: "MESSAGE_CREATE", d: {}, s: 42 });

		vi.advanceTimersByTime(41_250);
		const heartbeats = ws.sentPayloads.filter((p) => p.op === 1);
		expect(heartbeats.at(-1)).toEqual({ op: 1, d: 42 });
	});

	it("ignores heartbeat ACKs (op 11) silently", async () => {
		const ws = await connectAndReady();
		expect(() => ws.serverSend({ op: 11 })).not.toThrow();
	});
});

describe("disconnect handling", () => {
	it("disconnect() closes the socket, stops heartbeats and reports not connected", async () => {
		const ws = await connectAndReady();
		gateway.disconnect();

		expect(ws.closeCalls).toBe(1);
		expect(gateway.isConnected()).toBe(false);

		ws.sent.length = 0;
		await vi.advanceTimersByTimeAsync(100_000);
		expect(ws.sent).toHaveLength(0);
	});

	it("manual disconnect does NOT trigger a reconnect", async () => {
		await connectAndReady();
		gateway.disconnect();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("ignores events from a stale socket after reconnecting", async () => {
		await connectAndReady();
		const firstSocket = FakeWebSocket.last;

		gateway.disconnect();
		await gateway.connect();

		const secondSocket = FakeWebSocket.last;
		secondSocket.serverOpen();
		secondSocket.serverSend({ op: 10, d: { heartbeat_interval: 1000 } });
		secondSocket.serverSend({ op: 0, t: "READY", d: {} });

		firstSocket.serverClose(1006);
		await vi.advanceTimersByTimeAsync(1000);

		expect(gateway.isConnected()).toBe(true);
		expect(FakeWebSocket.instances).toHaveLength(2);
	});

	it("reconnects immediately when receiving op 7 (Reconnect)", async () => {
		const ws = await connectAndReady();
		ws.serverSend({ op: 7 });
		await vi.advanceTimersByTimeAsync(0);

		expect(ws.closeCalls).toBe(1);
		expect(FakeWebSocket.instances).toHaveLength(2);
	});

	it("reconnects after an unexpected close, with exponential backoff (1s, 2s, 4s)", async () => {
		await connectAndReady();

		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(999);
		expect(FakeWebSocket.instances).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(FakeWebSocket.instances).toHaveLength(2);

		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(1_999);
		expect(FakeWebSocket.instances).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(FakeWebSocket.instances).toHaveLength(3);

		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(3_999);
		expect(FakeWebSocket.instances).toHaveLength(3);
		await vi.advanceTimersByTimeAsync(1);
		expect(FakeWebSocket.instances).toHaveLength(4);
	});

	it("caps the backoff at 30 seconds", async () => {
		await connectAndReady();
		for (let i = 0; i < 5; i++) {
			FakeWebSocket.last.serverClose(1006);
			await vi.advanceTimersByTimeAsync(2 ** i * 1000);
		}
		const before = FakeWebSocket.instances.length;
		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(29_999);
		expect(FakeWebSocket.instances).toHaveLength(before);
		await vi.advanceTimersByTimeAsync(1);
		expect(FakeWebSocket.instances).toHaveLength(before + 1);
	});

	it("resets the backoff once READY is received again", async () => {
		await connectAndReady();
		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(1_000);
		FakeWebSocket.last.serverClose(1006);
		await vi.advanceTimersByTimeAsync(2_000);

		const ws = FakeWebSocket.last;
		ws.serverOpen();
		ws.serverSend({ op: 10, d: { heartbeat_interval: 1000 } });
		ws.serverSend({ op: 0, t: "READY", d: {} });

		const count = FakeWebSocket.instances.length;
		ws.serverClose(1006);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(FakeWebSocket.instances).toHaveLength(count + 1);
	});

	it("marks the gateway not-ready and stops heartbeats on close", async () => {
		const ws = await connectAndReady();
		ws.serverClose(1006);
		expect(gateway.isConnected()).toBe(false);

		ws.sent.length = 0;
		ws.readyState = FakeWebSocket.OPEN;
		vi.advanceTimersByTime(60_000);
		expect(ws.sent).toHaveLength(0);
	});

	it("close code 4004 (bad token): clears the token and does NOT reconnect", async () => {
		await connectAndReady();
		FakeWebSocket.last.serverClose(4004);
		await vi.advanceTimersByTimeAsync(120_000);

		expect(
			(await browser.storage.local.get("discord_token")).discord_token,
		).toBeUndefined();
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("close code 4004 with a failed (transient) refresh keeps the refresh token", async () => {
		await browser.storage.local.set({ discord_refresh_token: "r1" });
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		await connectAndReady();
		FakeWebSocket.last.serverClose(4004);
		await vi.advanceTimersByTimeAsync(10);

		const stored = await browser.storage.local.get([
			"discord_token",
			"discord_refresh_token",
		]);
		expect(stored.discord_token).toBeUndefined();
		expect(stored.discord_refresh_token).toBe("r1");
	});

	it("connect() refreshes when only a refresh token is left", async () => {
		await browser.storage.local.remove("discord_token");
		await browser.storage.local.set({ discord_refresh_token: "r1" });
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => ({
					access_token: "fresh",
					refresh_token: "r2",
					expires_in: 3600,
				}),
			}),
		);
		const ws = await connectAndReady();
		expect(ws.sentPayloads.find((p) => p.op === 2)?.d.token).toBe(
			"Bearer fresh",
		);
	});

	it("op 9 (invalid session): disconnects and clears the token", async () => {
		const ws = await connectAndReady();
		ws.serverSend({ op: 9, d: false });
		await vi.advanceTimersByTimeAsync(10);

		expect(gateway.isConnected()).toBe(false);
		expect(
			(await browser.storage.local.get("discord_token")).discord_token,
		).toBeUndefined();
		expect(FakeWebSocket.instances).toHaveLength(1);
	});

	it("can connect again after a manual disconnect", async () => {
		await connectAndReady();
		gateway.disconnect();
		await gateway.connect();
		expect(FakeWebSocket.instances).toHaveLength(2);
	});
});

describe("setActivity", () => {
	it("does nothing before READY", async () => {
		await gateway.connect();
		await gateway.setActivity(watching());
		expect(
			FakeWebSocket.last.sentPayloads.filter((p) => p.op === 3),
		).toHaveLength(0);
	});

	it("does nothing when never connected", async () => {
		await expect(gateway.setActivity(watching())).resolves.toBeUndefined();
	});

	it("caches the activity sent before READY and broadcasts it automatically upon READY", async () => {
		await gateway.connect();
		const ws = FakeWebSocket.last;
		ws.serverOpen();
		ws.serverSend({ op: 10, d: { heartbeat_interval: 1000 } });

		await gateway.setActivity(watching());
		expect(ws.sentPayloads.filter((p) => p.op === 3)).toHaveLength(0);

		ws.serverSend({ op: 0, t: "READY", d: {} });
		await vi.advanceTimersByTimeAsync(0);

		const presence = ws.sentPayloads.find((p) => p.op === 3);
		expect(presence).toBeDefined();
		expect(presence?.d.activities[0].details).toBe("Frieren");
	});

	const presence = async (
		state: Parameters<DiscordGateway["setActivity"]>[0],
	) => {
		const ws = await connectAndReady();
		await gateway.setActivity(state);
		const payload = ws.sentPayloads.find((p) => p.op === 3);
		if (!payload) throw new Error("no presence payload sent");
		return payload.d;
	};

	it("sends a Watching presence (op 3) for an active episode", async () => {
		const d = await presence(watching());

		expect(d.status).toBe("online");
		expect(d.afk).toBe(false);
		expect(d.since).toBeNull();
		expect(d.activities).toHaveLength(1);
		expect(d.activities[0]).toMatchObject({
			name: "Anime",
			type: 3,
			application_id: APPLICATION_ID,
			details: "Frieren",
			state: "Episode 3: Killing Magic",
			assets: {
				large_image: "mp:external/cover",
				large_text: "Frieren",
				small_image: "asset:play",
				small_text: "playing",
			},
		});
	});

	it("omits ': name' when there is no episode name", async () => {
		const d = await presence(watching({ episodeName: "" }));
		expect(d.activities[0].state).toBe("Episode 3");
	});

	it("sets start/end timestamps from position and duration while playing", async () => {
		const d = await presence(
			watching({ currentMs: 60_000, durationMs: 1_440_000 }),
		);
		expect(d.activities[0].timestamps).toEqual({
			start: NOW - 60_000,
			end: NOW - 60_000 + 1_440_000,
		});
	});

	it.each([
		["paused", { isPaused: true }],
		["at position 0", { currentMs: 0 }],
		["without a known duration", { durationMs: 0 }],
	])("sends no timestamps when %s", async (_label, patch) => {
		const d = await presence(watching(patch));
		expect(d.activities[0].timestamps).toBeUndefined();
	});

	it("uses the pause icon and 'paused' text when paused", async () => {
		const d = await presence(watching({ type: "PAUSED", isPaused: true }));
		expect(d.activities[0].assets.small_image).toBe("asset:pause");
		expect(d.activities[0].assets.small_text).toBe("paused");
	});

	it("registers the cover via getLargeImageKey when a coverUrl exists", async () => {
		await presence(watching());
		expect(getLargeImageKey).toHaveBeenCalledWith("https://cdn/cover.jpg");
	});

	it("uses the default_cover asset when there is no coverUrl", async () => {
		const d = await presence(watching({ coverUrl: "" }));
		expect(getLargeImageKey).not.toHaveBeenCalled();
		expect(d.activities[0].assets.large_image).toBe("asset:default_cover");
	});

	it("clears the presence (empty activities) for STOPPED", async () => {
		const d = await presence(watching({ type: "STOPPED" }));
		expect(d.activities).toEqual([]);
		expect(d.status).toBe("online");
	});
});
