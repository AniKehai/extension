import { logger } from "./logger";

export const MAX_TITLE_LENGTH = 128;

export const MAX_EPISODE_LENGTH = 64;

export const MAX_EPISODE_NAME_LENGTH = 128;

export const MAX_STATE_LENGTH = 128;

export const MAX_COVER_URL_LENGTH = 2048;

export const ALLOWED_COVER_DOMAINS = [
	// AniList media CDN
	"anilist.co",
	// Site owned image hosts
	"cdn.anipixcdn.co",
	"aniwaves.ru",
	"hianime.at",
	"myanimexadmin.online",
	"aniwatch.cx",
	"kaa.lt",
	"voir-anime.to",
];

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters from scraped metadata is the point of this regex
const CONTROL_CHARACTERS = /[\x00-\x1F\x7F]/g;

export function sanitizeString(
	input: string | null | undefined,
	maxLength: number,
): string {
	if (typeof input !== "string" || input.length === 0) return "";

	return input.replace(CONTROL_CHARACTERS, "").trim().slice(0, maxLength);
}

const isAllowedCoverHost = (hostname: string) =>
	ALLOWED_COVER_DOMAINS.some(
		(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
	);

export function sanitizeCoverUrl(url: string | null | undefined): string {
	if (typeof url !== "string") return "";

	const trimmed = url.trim();
	if (!trimmed) return "";

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		logger.warn("[sanitize] Rejected malformed cover URL");
		return "";
	}

	if (parsed.protocol !== "https:") {
		logger.warn("[sanitize] Rejected non-HTTPS cover URL:", parsed.hostname);
		return "";
	}

	if (parsed.username || parsed.password) {
		logger.warn(
			"[sanitize] Rejected cover URL with credentials:",
			parsed.hostname,
		);
		return "";
	}

	if (!isAllowedCoverHost(parsed.hostname)) {
		logger.warn(
			"[sanitize] Rejected cover URL from untrusted domain:",
			parsed.hostname,
		);
		return "";
	}

	return trimmed.slice(0, MAX_COVER_URL_LENGTH);
}
