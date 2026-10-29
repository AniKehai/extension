import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

const TITLE_REGEX = /^(.+?)\s+-\s+Episode\s+(\S+)\s+\|\s+Re:ANIME$/i;

const EP_NUMBER_REGEX = /^EP\s*\d+/i;
const AUDIO_REGEX = /^(sub|dub)$/i;
const DATE_REGEX = /^[A-Z]{3}\s+\d{1,2},\s*\d{4}$/i;

const getEpisodeName = (episodeNumber: string): string | null => {
	const links = document.querySelectorAll<HTMLAnchorElement>(
		'a[href*="/watch/"][href*="ep="]',
	);

	for (const link of links) {
		const ep = new URL(link.href, window.location.origin).searchParams.get(
			"ep",
		);
		if (ep !== episodeNumber) continue;

		const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			const text = walker.currentNode.textContent?.trim();
			if (
				!text ||
				EP_NUMBER_REGEX.test(text) ||
				AUDIO_REGEX.test(text) ||
				DATE_REGEX.test(text)
			) {
				continue;
			}
			return text;
		}
	}

	return null;
};

export const reanimeStrategy: AnimeSite = {
	domains: ["reanime.to", "reanime.cz", "reanime.wtf"],
	iframe_src: ["flixcloud.cc"],

	getAnimeMetadata: () => {
		if (!/\/watch\//.test(window.location.pathname)) {
			return { title: null, episode: null, coverUrl: null };
		}

		const match = document.title.trim().match(TITLE_REGEX);

		const epParam = new URLSearchParams(window.location.search).get("ep");
		const epFromUrl = epParam && /^\d+(\.\d+)?$/.test(epParam) ? epParam : null;

		const title = match?.[1]?.trim();
		const episodeNumber = match?.[2] ?? epFromUrl;

		const episode = episodeNumber ? `Episode ${episodeNumber}` : null;
		const episodeName = episodeNumber ? getEpisodeName(episodeNumber) : null;

		const coverUrl = document
			.querySelector<HTMLMetaElement>('meta[property="og:image"]')
			?.content?.trim();

		return {
			title: title || null,
			episode,
			episodeName: episodeName && episodeName !== episode ? episodeName : null,
			coverUrl: coverUrl || null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
