import type { AnimeSite } from "../../shared/types";
import { getStandardVideoStats } from "../parser";

export const aniwatchStrategy: AnimeSite = {
	domains: ["aniwatch.cx"],
	iframe_src: ["vidnest.fun", "tryembed.us.cc", "megaplay.buzz"],

	getAnimeMetadata: () => {
		const titleElement = document.querySelector(".mq-nowplaying__h .mq-flip");
		const episodeElement = document.querySelector(
			".mq-nowplaying__ep span[data-mq-now]",
		);
		const episodeNameElement = document.querySelector(
			".mq-nowplaying__ep span[data-mq-now-name]",
		);
		const imageElement = document.querySelector(
			".mq-showcard a.mq-showcard__art img",
		) as HTMLImageElement;

		const title =
			titleElement?.getAttribute("data-mq-en") ||
			titleElement?.textContent?.trim();

		const episode = episodeElement?.textContent?.trim();

		let episodeName = episodeNameElement?.textContent?.trim();
		if (episodeName?.startsWith(":")) {
			episodeName = episodeName.replace(/^:\s*/, "").trim();
		}

		const coverUrl = imageElement?.src;

		return {
			title: title ?? null,
			episode: episode ?? null,
			episodeName: episodeName || null,
			coverUrl: coverUrl ?? null,
		};
	},

	getProgressStats: () => getStandardVideoStats(),
};
