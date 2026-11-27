import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const hianimeStrategy: AnimeSite = {
    domains: ["hianime.fm"],
    iframe_src: ["zokoanime.video", "megaplay.buzz"],

    getAnimeMetadata: () => {
        const titleElement = document.querySelector(
            ".anisc-detail .film-name a",
        );
        const episodeElement = document.querySelector(".server-notice b");
        const episodeNameElement = document.querySelector(
            ".ss-list a.active .ep-name, .ep-item.active .ep-name",
        );
        const imageElement = document.querySelector(
            ".anisc-poster .film-poster img",
        ) as HTMLImageElement;

        const title = titleElement?.textContent?.trim();
        const episode = episodeElement?.textContent?.trim();
        const episodeName = episodeNameElement?.textContent?.trim();
        const coverUrl = imageElement?.src;

        return {
            title: title ?? null,
            episode: episode ?? null,
            episodeName:
                episodeName && episode !== episodeName ? episodeName : null,
            coverUrl: coverUrl ?? null,
        };
    },

    getProgressStats: () => getStandardVideoStats(),
};
