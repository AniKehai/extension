import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	activityEnabled,
	clearAnimeState,
	commitBroadcast,
	currentAnimeState,
	evaluateDiscordUpdate,
	privacyEnabled,
	setActivityEnabledFlag,
	setPrivacyEnabledFlag,
} from "../../../src/core/state/playback";

const NOW = 1_700_000_000_000;

const setAnime = (patch: Partial<typeof currentAnimeState> = {}) =>
	Object.assign(currentAnimeState, {
		title: "Frieren",
		episode: "Episode 1",
		episodeName: "",
		coverUrl: "https://img/x.jpg",
		currentMs: 10_000,
		durationMs: 1_440_000,
		isPaused: false,
		...patch,
	});

const broadcastNow = (type: "INFO_UPDATE" | "TIME_UPDATE" = "TIME_UPDATE") => {
	const { newEstimatedStart } = evaluateDiscordUpdate(type);
	commitBroadcast(newEstimatedStart);
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	clearAnimeState();
	setActivityEnabledFlag(true);
	setPrivacyEnabledFlag(false);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("clearAnimeState", () => {
	it("resets every field to its default", () => {
		setAnime({ isPaused: true, episodeName: "Pilot" });
		clearAnimeState();

		expect(currentAnimeState).toEqual({
			title: null,
			episode: null,
			episodeName: undefined,
			coverUrl: "",
			currentMs: 0,
			durationMs: 0,
			isPaused: false,
		});
	});

	it("also forgets the last broadcast (next evaluation is a fresh update)", () => {
		setAnime();
		broadcastNow();
		clearAnimeState();
		setAnime();
		expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
	});
});

describe("setActivityEnabledFlag", () => {
	it("toggles the exported live binding", () => {
		setActivityEnabledFlag(false);
		expect(activityEnabled).toBe(false);
		setActivityEnabledFlag(true);
		expect(activityEnabled).toBe(true);
	});
});

describe("setPrivacyEnabledFlag", () => {
	it("toggles the exported live binding", () => {
		setPrivacyEnabledFlag(true);
		expect(privacyEnabled).toBe(true);
		setPrivacyEnabledFlag(false);
		expect(privacyEnabled).toBe(false);
	});
});

describe("evaluateDiscordUpdate", () => {
	it("updates on the very first info", () => {
		setAnime();
		expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
	});

	it("TIME_UPDATE estimates start as now - currentMs", () => {
		setAnime({ currentMs: 30_000 });
		expect(evaluateDiscordUpdate("TIME_UPDATE").newEstimatedStart).toBe(
			NOW - 30_000,
		);
	});

	it("INFO_UPDATE keeps the previously committed estimated start", () => {
		setAnime({ currentMs: 30_000 });
		broadcastNow();
		vi.advanceTimersByTime(60_000);
		expect(evaluateDiscordUpdate("INFO_UPDATE").newEstimatedStart).toBe(
			NOW - 30_000,
		);
	});

	describe("once a broadcast was committed", () => {
		beforeEach(() => {
			setAnime();
			broadcastNow();
		});

		it("does NOT update when nothing changed", () => {
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(false);
		});

		it("does NOT update during normal playback progress", () => {
			vi.advanceTimersByTime(5_000);
			currentAnimeState.currentMs += 5_000;
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(false);
		});

		it("tolerates drift up to 2500ms", () => {
			vi.advanceTimersByTime(2_500);
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(false);
		});

		it("updates when drift exceeds 2500ms (user seeked / buffered)", () => {
			vi.advanceTimersByTime(2_501);
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(true);
		});

		it("updates when the user seeks forward", () => {
			currentAnimeState.currentMs = 600_000;
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(true);
		});

		it("ignores drift while paused on TIME_UPDATE", () => {
			currentAnimeState.isPaused = true;
			broadcastNow();
			vi.advanceTimersByTime(10_000);
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(false);
		});

		it("never treats drift as an update for INFO_UPDATE", () => {
			vi.advanceTimersByTime(10_000);
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(false);
		});

		it("updates when the title changes", () => {
			currentAnimeState.title = "Another Show";
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
		});

		it("updates when the episode changes", () => {
			currentAnimeState.episode = "Episode 2";
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
		});

		it("updates on pause", () => {
			currentAnimeState.isPaused = true;
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(true);
		});

		it("updates on resume", () => {
			currentAnimeState.isPaused = true;
			broadcastNow();
			currentAnimeState.isPaused = false;
			expect(evaluateDiscordUpdate("TIME_UPDATE").shouldUpdate).toBe(true);
		});

		it("updates when duration changes by more than 1s", () => {
			currentAnimeState.durationMs += 1_001;
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
		});

		it("ignores duration jitter of 1s or less", () => {
			currentAnimeState.durationMs += 1_000;
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(false);
		});

		it("does not update when only episodeName changes", () => {
			currentAnimeState.episodeName = "A brand new name";
			expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(false);
		});
	});
});

describe("commitBroadcast", () => {
	it("snapshots the current state so identical state no longer triggers updates", () => {
		setAnime();
		expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(true);
		commitBroadcast(123);
		expect(evaluateDiscordUpdate("INFO_UPDATE").shouldUpdate).toBe(false);
	});
});
