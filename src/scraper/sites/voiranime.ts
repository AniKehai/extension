import { logger } from "../../shared/logger";
import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

function normalizeEpisode(episode: string): string {
	return episode.replace(/Episode\s+0*(\d+(?:\.\d+)?)/i, "Episode $1");
}

let cachedCoverUrl: string | null = null;
let currentTitle: string | null = null;
let isFetching = false;
let fetchFailed = false;
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5 * 1000;

function fetchCoverFromAniList(title: string): void {
	if (retryCount >= MAX_RETRIES) {
		fetchFailed = true;
		isFetching = false;
		return;
	}

	isFetching = true;

	const searchTitle = title.split("(VF)")[0]?.trim() ?? title;
	logger.log(searchTitle);

	browser.runtime
		.sendMessage({
			type: "FETCH_ANILIST_BY_TITLE",
			title: searchTitle,
		})
		.then((response: { coverUrl: string }) => {
			if (response?.coverUrl) {
				cachedCoverUrl = response.coverUrl;
				retryCount = 0;
				fetchFailed = false;
				logger.log(cachedCoverUrl, retryCount, fetchFailed);
			} else {
				scheduleRetry(searchTitle);
			}
		})
		.catch((error) => {
			logger.error("AniList:", error.message);
			scheduleRetry(searchTitle);
		})
		.finally(() => {
			isFetching = false;
		});
}

function scheduleRetry(title: string): void {
	retryCount++;
	const delay = RETRY_DELAY_MS * 2 ** (retryCount - 1);
	logger.log(
		`AniList fetch failed, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`,
	);

	setTimeout(() => {
		if (!fetchFailed && title === currentTitle) {
			fetchCoverFromAniList(title);
		}
	}, delay);
}

export const voiranimeStrategy: AnimeSite = {
	domains: ["voir-anime.to"],
	iframe_src: ["voembed.net", "mfw09.org", "voe.sx", "streamtape.com"],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector(
			".c-breadcrumb li:nth-last-child(2) a",
		);

		const select = document.querySelector(
			".single-chapter-select",
		) as HTMLSelectElement;
		const episodeElement = select?.options[select.selectedIndex];

		let coverUrl: string | null = null;

		const title = titleElement?.textContent?.trim() ?? null;

		if (title && title !== currentTitle) {
			currentTitle = title;
			cachedCoverUrl = null;
			isFetching = false;
			fetchFailed = false;
			retryCount = 0;
		}

		if (!cachedCoverUrl && !isFetching && !fetchFailed && title) {
			fetchCoverFromAniList(title);
		}

		if (cachedCoverUrl) {
			coverUrl = cachedCoverUrl;
		}

		return {
			title,
			episode: episodeElement
				? normalizeEpisode(`Episode ${episodeElement?.textContent?.trim()}`)
				: null,
			coverUrl: coverUrl,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
