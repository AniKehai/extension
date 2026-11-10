import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats, parseTimeText } from "../parser";

export const banimeStrategy: AnimeSite = {
	domains: ["banime.top"],
	iframe_src: [],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector("h2.text-base.font-extrabold");
		const title = titleElement?.textContent?.trim() ?? null;

		const episodeElement = document.querySelector("h1 span.text-neutral-500");
		let episode: string | null = null;

		if (episodeElement?.textContent) {
			const match =
				episodeElement.textContent.match(/Episode\s*(\d+)/i) ||
				episodeElement.textContent.match(/Ep\s*(\d+)/i);
			if (match) {
				episode = `Episode ${match[1]}`;
			}
		}

		let episodeName: string | null = null;
		const activeSidebarItem = document.querySelector(
			'button[aria-current="true"] span.truncate.text-sm.font-semibold',
		);
		if (activeSidebarItem?.textContent) {
			const match = activeSidebarItem.textContent.match(/^\d+\s*·\s*(.+)/);
			episodeName = match?.[1]
				? match[1].trim()
				: activeSidebarItem.textContent.trim();
		}

		const imageElement = document.querySelector(
			'section[aria-label="About this series"] img',
		) as HTMLImageElement | null;

		return {
			title,
			episode,
			episodeName: episodeName && episode !== episodeName ? episodeName : null,
			coverUrl: imageElement?.src ?? null,
		};
	},

	getProgressStats: () => {
		const timeContainer = document.querySelector(
			'.video-shell .font-mono.tabular-nums, .controls-on .font-mono.tabular-nums, [class*="video"] .font-mono.tabular-nums',
		);

		if (timeContainer?.textContent) {
			const timeMatch = timeContainer.textContent.match(
				/([\d:]+)\s*\/\s*([\d:]+)/,
			);

			if (timeMatch) {
				const currentMs = parseTimeText(timeMatch[1]);
				const durationMs = parseTimeText(timeMatch[2]);

				const playButton = document.querySelector(
					'button[aria-label="Play"], button[title*="Play" i]',
				);
				const pauseButton = document.querySelector(
					'button[aria-label="Pause"], button[title*="Pause" i]',
				);
				const isPaused = !!playButton && !pauseButton;

				if (durationMs > 0) {
					return { currentMs, durationMs, isPaused };
				}
			}
		}

		const seekSlider = document.querySelector(
			'[role="slider"][aria-valuemax][aria-valuenow]',
		);
		if (seekSlider) {
			const durationSec = parseInt(
				seekSlider.getAttribute("aria-valuemax") || "0",
				10,
			);
			const currentSec = parseInt(
				seekSlider.getAttribute("aria-valuenow") || "0",
				10,
			);
			if (durationSec > 0) {
				const playButton = document.querySelector(
					'button[aria-label="Play"], button[title*="Play" i]',
				);
				const pauseButton = document.querySelector(
					'button[aria-label="Pause"], button[title*="Pause" i]',
				);
				const isPaused = !!playButton && !pauseButton;
				return {
					currentMs: currentSec * 1000,
					durationMs: durationSec * 1000,
					isPaused,
				};
			}
		}

		const videoElement = document.querySelector("video");
		if (videoElement && Number.isFinite(videoElement.duration)) {
			const isPaused = videoElement.paused || videoElement.ended;
			return {
				currentMs: Math.floor(videoElement.currentTime * 1000),
				durationMs: Math.floor(videoElement.duration * 1000),
				isPaused,
			};
		}

		return getStandardVideoStats();
	},
};
