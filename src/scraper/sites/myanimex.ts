import { logger } from "../../shared/logger";
import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

const ACTIVE_EPISODE_BORDER = "229, 9, 20";

const getActiveEpisodeNumber = (): string | null => {
	try {
		const heading = Array.from(document.querySelectorAll("h2")).find(
			(h) => h.textContent?.trim() === "Episodes",
		);

		const buttons = heading?.nextElementSibling?.querySelectorAll("button");
		if (!buttons) return null;

		for (const button of buttons) {
			const isActive =
				button.style.borderColor.includes(ACTIVE_EPISODE_BORDER) ||
				window
					.getComputedStyle(button)
					.borderColor.includes(ACTIVE_EPISODE_BORDER);
			if (!isActive) continue;

			const text = button.textContent?.trim() ?? "";
			return text.match(/\d+(?:\.\d+)?/)?.[0] ?? null;
		}
	} catch (error) {
		logger.error("Animex: failed to parse active episode", error);
	}
	return null;
};

const getHeroCoverUrl = (): string | null => {
	for (const el of document.querySelectorAll<HTMLElement>(
		'div[style*="background-image"]',
	)) {
		const url = el.style.backgroundImage.match(
			/url\(["']?(https?:[^"')]+)["']?\)/,
		)?.[1];
		if (url) return url;
	}
	return null;
};

const findShadowVideo = (): HTMLVideoElement | null => {
	for (const el of document.querySelectorAll("*")) {
		const video = el.shadowRoot?.querySelector("video");
		if (video) return video;
	}
	return null;
};

export const myanimexStrategy: AnimeSite = {
	domains: ["myanimex.com", "www.myanimex.com"],
	iframe_src: ["player.mediadelivery.net"],

	getAnimeMetadata: () => {
		const title = document.querySelector("h1")?.textContent?.trim();
		const episodeNumber = getActiveEpisodeNumber();

		return {
			title: title || null,
			episode: episodeNumber ? `Episode ${episodeNumber}` : null,
			episodeName: null,
			coverUrl: getHeroCoverUrl(),
		};
	},

	getProgressStats: () => {
		const stats = getStandardVideoStats();
		if (stats.durationMs > 0) return stats;

		const video = findShadowVideo();
		if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
			return stats;
		}

		const currentMs = Math.floor(video.currentTime * 1000);
		const durationMs = Math.floor(video.duration * 1000);
		return {
			currentMs,
			durationMs,
			isPaused: video.paused || video.ended,
		};
	},
};
