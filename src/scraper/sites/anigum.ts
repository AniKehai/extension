import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const anigumStrategy: AnimeSite = {
	domains: ["anigum.com", "anirose.site"],
	iframe_src: ["vidnest.fun", "megaplay.buzz", "bysewihe.com", "n1mwq.org"],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector("h1.text-2xl, h1");
		const title = titleElement?.textContent?.trim();

		const imageElement = document.querySelector(
			"div.flex.gap-5.mt-2 > img",
		) as HTMLImageElement;
		const coverUrl = imageElement?.src;

		const episodeCounter = document.querySelector(
			'[data-testid="nav-episode-counter"]',
		);
		let episode: string | null = null;

		if (episodeCounter?.textContent) {
			const match = episodeCounter.textContent.match(/^(\d+)/);
			if (match) {
				episode = `Episode ${match[1]}`;
			}
		}

		return {
			title: title ?? null,
			episode: episode ?? null,
			episodeName: null,
			coverUrl: coverUrl ?? null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
