import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

const EP_PATH_REGEX = /\/ep-(\d+(?:\.\d+)?)/;
const TITLE_REGEX =
	/^KickAssAnime\s+-\s+(.+?)\s+-\s+Episode\s+(\d+(?:\.\d+)?)/i;

const CACHE_KEY = "kaa_metadata_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CachedMetadata {
	title: string;
	episode: string;
	episodeName: string | null;
	coverUrl: string;
	timestamp: number;
}

function getCachedMetadata(): CachedMetadata | null {
	try {
		const cached = sessionStorage.getItem(CACHE_KEY);
		if (!cached) return null;
		const data: CachedMetadata = JSON.parse(cached);
		if (Date.now() - data.timestamp > CACHE_TTL) {
			sessionStorage.removeItem(CACHE_KEY);
			return null;
		}
		return data;
	} catch {
		return null;
	}
}

function setCachedMetadata(data: Omit<CachedMetadata, "timestamp">) {
	try {
		sessionStorage.setItem(
			CACHE_KEY,
			JSON.stringify({ ...data, timestamp: Date.now() }),
		);
	} catch {
		// Ignore storage errors
	}
}

function clearCachedMetadata() {
	try {
		sessionStorage.removeItem(CACHE_KEY);
	} catch {
		// Ignore storage errors
	}
}

function normalizeEpisode(episode: string): string {
	return episode.replace(/Episode\s+0*(\d+(?:\.\d+)?)/i, "Episode $1");
}

function isEpisodePage(): boolean {
	return EP_PATH_REGEX.test(window.location.pathname);
}

function extractTitle(): string | null {
	if (!isEpisodePage()) return null;

	let titleElement = document.querySelector(".v-card__title h1.text-h6");
	let title = titleElement?.textContent?.trim();

	if (!title) {
		titleElement = document.querySelector("h1.text-h6");
		title = titleElement?.textContent?.trim();
	}

	if (!title) {
		const titleMatch = document.title.trim().match(TITLE_REGEX);
		if (titleMatch?.[1]) title = titleMatch[1].trim();
	}

	return title ?? null;
}

function extractEpisode(): string | null {
	if (!isEpisodePage()) return null;

	const episodeElement = document.querySelector(
		".v-card__title .text-overline",
	);
	let episode = episodeElement?.textContent?.trim();

	if (!episode) {
		const titleMatch = document.title.trim().match(TITLE_REGEX);
		if (titleMatch?.[2]) episode = `Episode ${titleMatch[2]}`;
	}

	if (!episode) {
		const pathMatch = window.location.pathname.match(EP_PATH_REGEX);
		if (pathMatch) episode = `Episode ${pathMatch[1]}`;
	}

	return episode ? normalizeEpisode(episode) : null;
}

function extractEpisodeName(): string | null {
	if (!isEpisodePage()) return null;

	const activePlayIcon = document.querySelector(".episode-list-item .mdi-play");
	if (activePlayIcon) {
		const activeEpisodeItem = activePlayIcon.closest(".episode-list-item");
		const name = activeEpisodeItem
			?.querySelector(".v-list-item__title")
			?.textContent?.trim();
		if (name) return name;
	}

	const activeItem = document.querySelector(
		".episode-list-item.v-list-item--active",
	);
	if (activeItem) {
		return (
			activeItem.querySelector(".v-list-item__title")?.textContent?.trim() ??
			null
		);
	}

	return null;
}

function extractCoverUrl(): string | null {
	let coverDiv = document.querySelector(
		".episode-list + .row .col-sm-2 .v-card--link .v-image__image--cover",
	) as HTMLElement;

	if (!coverDiv) {
		coverDiv = document.querySelector(
			".v-card--link .v-image__image--cover",
		) as HTMLElement;
	}

	if (!coverDiv) {
		coverDiv = document.querySelector(
			".v-image__image[style*='/image/poster/']",
		) as HTMLElement;
	}

	if (!coverDiv) {
		coverDiv = document.querySelector(".v-image__image--cover") as HTMLElement;
	}

	if (coverDiv?.style?.backgroundImage) {
		const match = coverDiv.style.backgroundImage.match(
			/url\(['"]?(.*?)['"]?\)/,
		);
		if (match?.[1]) return match[1];
	}

	return null;
}

export const kaaStrategy: AnimeSite = {
	domains: ["kaa.lt"],
	iframe_src: ["krussdomi.com"],

	getAnimeMetadata: () => {
		if (!isEpisodePage()) {
			return {
				title: null,
				episode: null,
				episodeName: undefined,
				coverUrl: null,
			};
		}

		const title = extractTitle();
		const episode = extractEpisode();
		const episodeName = extractEpisodeName();
		const coverUrl = extractCoverUrl();

		const cached = getCachedMetadata();

		const cachedTitleMatches = cached && title && cached.title === title;

		const finalTitle = title ?? (cachedTitleMatches ? cached.title : null);
		const finalEpisode =
			episode ?? (cachedTitleMatches ? cached.episode : null);
		const finalEpisodeName =
			episodeName ?? (cachedTitleMatches ? cached.episodeName : null);
		const finalCoverUrl =
			coverUrl ?? (cachedTitleMatches ? cached.coverUrl : null);

		if (title && episode) {
			if (!cachedTitleMatches && cached) {
				clearCachedMetadata();
			}
			setCachedMetadata({
				title,
				episode,
				episodeName,
				coverUrl: coverUrl ?? "",
			});
		}

		const result: ReturnType<typeof kaaStrategy.getAnimeMetadata> = {
			title: finalTitle,
			episode: finalEpisode,
			coverUrl: finalCoverUrl ?? null,
		};
		if (finalEpisodeName) result.episodeName = finalEpisodeName;

		return result;
	},

	getProgressStats: () => getStandardVideoStats(),
};
