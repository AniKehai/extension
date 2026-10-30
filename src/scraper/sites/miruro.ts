import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

const COVER_SELECTOR =
	'img[src*="anilistcdn/media/anime/cover"][alt]:not([alt=""])';
const EPISODE_LABEL_REGEX = /^Episode\s+(\S+)$/i;
const EPISODE_NUMBER_REGEX = /^\d+(\.\d+)?$/;

const getEpisodeInfo = (): { episode: string; name: string | null } | null => {
	for (const h1 of document.querySelectorAll("h1")) {
		const match = h1.nextElementSibling?.textContent
			?.trim()
			.match(EPISODE_LABEL_REGEX);
		if (match) {
			return {
				episode: `Episode ${match[1]}`,
				name: h1.textContent?.trim() || null,
			};
		}
	}
	return null;
};

export const miruroStrategy: AnimeSite = {
	domains: ["www.miruro.cx"],
	iframe_src: ["strm.cx", "megaplay.buzz"],

	getAnimeMetadata: () => {
		if (!window.location.pathname.startsWith("/watch/")) {
			return { title: null, episode: null, coverUrl: null };
		}

		const cover = document.querySelector<HTMLImageElement>(COVER_SELECTOR);
		const info = getEpisodeInfo();

		const epParam = new URLSearchParams(window.location.search).get("ep");
		const episode =
			info?.episode ??
			(epParam && EPISODE_NUMBER_REGEX.test(epParam)
				? `Episode ${epParam}`
				: null);

		return {
			title: (cover?.alt ?? "").trim() || null,
			episode,
			episodeName: info?.name && info.name !== episode ? info.name : null,
			coverUrl: cover?.src || null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
