import { extractMatches } from "../scraper/extractor";
import { strategies } from "../scraper/sites";
import { CHECK_ACTIVITY_INTERVAL } from "../shared/constants";
import { logger } from "../shared/logger";
import {
	MAX_EPISODE_LENGTH,
	MAX_EPISODE_NAME_LENGTH,
	MAX_TITLE_LENGTH,
	sanitizeCoverUrl,
	sanitizeString,
} from "../shared/sanitize";

const isMatch = (host: string, d: string) => host === d;
const isSubdomainMatch = (host: string, d: string) =>
	host === d || host.endsWith(`.${d}`);

const KAA_EPISODE_PATH_REGEX = /\/ep-(\d+(?:\.\d+)?)/;

let hasSentValidInfoUpdate = false;
const GRACE_PERIOD_MS = 30_000;
const pageLoadTime = Date.now();

const coordinationChannel = new BroadcastChannel(
	"anikehai-presence-coordination",
);
let _isTimeAuthority = false;
let _isMetadataAuthority = false;

export default defineContentScript({
	matches: [...extractMatches(strategies)],
	allFrames: true,

	main(ctx) {
		const host = window.location.hostname;

		const metaStrategy = strategies.find((stg) =>
			stg.domains.some((domain) => isMatch(host, domain)),
		);

		const iframeStrategy = strategies.find((stg) =>
			stg.iframe_src.some((src) => isSubdomainMatch(host, src)),
		);

		if (!metaStrategy && !iframeStrategy) return;

		const isIframe = window !== window.top;
		const isMainFrame = !isIframe && metaStrategy;
		const isVideoFrame = isIframe && iframeStrategy;

		if (isVideoFrame) {
			_isTimeAuthority = true;
		} else if (isMainFrame) {
			_isMetadataAuthority = true;
		}

		coordinationChannel.onmessage = (event) => {
			if (event.data.type === "INFO_UPDATE_SENT") {
			} else if (event.data.type === "TIME_UPDATE_SENT") {
			}
		};

		if (isVideoFrame && window !== window.top && !metaStrategy) {
			try {
				const referrer = document.referrer;
				if (referrer) {
					const parentHost = new URL(referrer).hostname;
					const parentMatches = strategies.some((stg) =>
						stg.domains.some((domain) => isMatch(parentHost, domain)),
					);
					if (!parentMatches) return;
				}
			} catch {
				return;
			}
		}

		const send = (message: object) => {
			browser.runtime.sendMessage(message).catch((err) => {
				logger.warn("sendMessage failed:", err);
			});
		};

		const isKaaLtEpisodePage =
			isMainFrame &&
			host === "kaa.lt" &&
			KAA_EPISODE_PATH_REGEX.test(window.location.pathname) &&
			(document.querySelector(".v-card__title") ||
				document.querySelector(".v-image__image") ||
				document.querySelector(".episode-list-item"));

		ctx.setInterval(() => {
			try {
				const now = Date.now();
				const inGracePeriod =
					isKaaLtEpisodePage && now - pageLoadTime < GRACE_PERIOD_MS;

				if (iframeStrategy) {
					const stats = iframeStrategy.getProgressStats();

					send({
						type: "TIME_UPDATE",
						currentMs: stats.currentMs,
						durationMs: stats.durationMs,
						isPaused: stats.isPaused ?? true,
					});

					coordinationChannel.postMessage({ type: "TIME_UPDATE_SENT" });
					return;
				}

				if (isMainFrame && metaStrategy) {
					const meta = metaStrategy.getAnimeMetadata();

					const title = sanitizeString(meta.title, MAX_TITLE_LENGTH);
					const episode = sanitizeString(meta.episode, MAX_EPISODE_LENGTH);
					const episodeName = sanitizeString(
						meta.episodeName,
						MAX_EPISODE_NAME_LENGTH,
					);
					const coverUrl = sanitizeCoverUrl(meta.coverUrl);

					const hasValidMetadata = title && episode;

					if (!hasValidMetadata) {
						if (inGracePeriod) {
							logger.log("[kaa] Grace period: skipping STOPPED");
							return;
						}
						if (hasSentValidInfoUpdate) {
							send({ type: "STOPPED" });
						}
						return;
					}

					hasSentValidInfoUpdate = true;

					send({
						type: "INFO_UPDATE",
						title,
						episode,
						episodeName: episodeName || null,
						coverUrl,
					});

					coordinationChannel.postMessage({ type: "INFO_UPDATE_SENT" });
				}
			} catch (err) {
				logger.error("DOM scraping error:", err);
			}
		}, CHECK_ACTIVITY_INTERVAL * 1000);
	},
});
