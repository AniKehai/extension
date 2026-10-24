import { describe, expect, it } from "vitest";
import { getStandardVideoStats, parseTimeText } from "../../src/scraper/parser";
import { mockVideo, setBody } from "../helpers/dom";

describe("parseTimeText", () => {
	it.each([
		["01:30", 90_000],
		["0:05", 5_000],
		["59:59", 3_599_000],
		["1:02:03", 3_723_000],
		["00:00:00", 0],
		["-00:45", 45_000],
		["  10:00  ", 600_000],
	])("parses %j into %d ms", (input, expected) => {
		expect(parseTimeText(input)).toBe(expected);
	});

	it.each([
		["empty string", ""],
		["null", null],
		["undefined", undefined],
		["a bare number with no colon", "42"],
		["too many segments", "1:2:3:4"],
	])("returns 0 for %s", (_label, input) => {
		expect(parseTimeText(input)).toBe(0);
	});

	it("returns 0 (not NaN) for non-numeric input like 'ab:cd'", () => {
		expect(parseTimeText("ab:cd")).toBe(0);
	});
});

describe("getStandardVideoStats", () => {
	it("reads duration, position and pause state from a <video>", () => {
		setBody("<video></video>");
		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: 1440.5,
			currentTime: 60.2,
			paused: true,
		});

		expect(getStandardVideoStats()).toEqual({
			currentMs: 60_200,
			durationMs: 1_440_500,
			isPaused: true,
		});
	});

	it("reports isPaused=false while the video plays", () => {
		setBody("<video></video>");
		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: 100,
			currentTime: 10,
			paused: false,
		});
		expect(getStandardVideoStats().isPaused).toBe(false);
	});

	it("treats NaN duration (metadata not loaded) as 0", () => {
		setBody("<video></video>");
		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: Number.NaN,
			currentTime: 0,
			paused: true,
		});
		expect(getStandardVideoStats()).toMatchObject({
			currentMs: 0,
			durationMs: 0,
		});
	});

	it("prefers <video> over JW Player text when both exist", () => {
		setBody(`
			<video></video>
			<span class="jw-text-elapsed">05:00</span>
			<span class="jw-text-countdown">-05:00</span>`);
		mockVideo(document.querySelector("video") as HTMLVideoElement, {
			duration: 20,
			currentTime: 5,
			paused: false,
		});
		expect(getStandardVideoStats().durationMs).toBe(20_000);
	});

	it("falls back to JW Player elapsed/countdown text", () => {
		setBody(`
			<span class="jw-text-elapsed">01:00</span>
			<span class="jw-text-countdown">-23:00</span>
			<div class="jw-state-paused"></div>`);

		expect(getStandardVideoStats()).toEqual({
			currentMs: 60_000,
			durationMs: 1_440_000,
			isPaused: true,
		});
	});

	it("JW Player: not paused when the paused-state class is absent", () => {
		setBody(`
			<span class="jw-text-elapsed">00:10</span>
			<span class="jw-text-countdown">-00:50</span>`);
		expect(getStandardVideoStats().isPaused).toBe(false);
	});

	it("returns zeros and isPaused=null when there is no player at all", () => {
		setBody("<div>nothing here</div>");
		expect(getStandardVideoStats()).toEqual({
			currentMs: 0,
			durationMs: 0,
			isPaused: null,
		});
	});
});
