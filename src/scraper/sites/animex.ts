import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const animexStrategy: AnimeSite = {
	domains: ["animex.one"],
	iframe_src: [
		"plyr.animex.one",
		"flixcloud.cc",
		"megaplay.buzz",
		"vidcloud.se",
	],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector(
			'a[href^="/anime/"] span.font-semibold.tracking-wide',
		);
		const title = titleElement?.textContent?.trim() ?? null;

		const watchingElement = document.querySelector(
			"span.truncate.text-sm.font-bold.text-white",
		);
		let episode: string | null = null;
		let episodeName: string | null = null;

		if (watchingElement?.textContent) {
			const parts = watchingElement.textContent.split(":");
			if (parts.length >= 2) {
				episode = parts[0]?.trim() ?? null;
				episodeName = parts.slice(1).join(":").trim();
			} else {
				episode = watchingElement.textContent.trim();
			}
		}

		if (!episode || !episodeName) {
			const activeEpisodeBlock = document.querySelector(
				"button[disabled] .line-clamp-1.font-bold",
			);
			if (activeEpisodeBlock?.textContent) {
				const match = activeEpisodeBlock.textContent.match(/^(\d+)\.\s*(.+)/);
				if (match) {
					episode = `Episode ${match[1]}`;
					episodeName = match[2]?.trim() ?? null;
				}
			}
		}

		if (episodeName) {
			episodeName = episodeName
				.replace(/^Release:\s*\d{4}[-/]\d{2}[-/]\d{2}.*?-\s*/i, "")
				.trim();
		}

		const coverElement = document.querySelector(
			'img[alt$=" cover"]',
		) as HTMLImageElement | null;
		const coverUrl = coverElement?.src ?? null;

		return {
			title,
			episode,
			episodeName,
			coverUrl,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
