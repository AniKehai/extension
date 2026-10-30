import { logger } from "../../shared/logger";

const ANILIST_TIMEOUT_MS = 10_000;

export async function fetchAnilistCover(
	anilistId: number,
): Promise<string | null> {
	const query = `
        query ($id: Int) {
            Media (id: $id, type: ANIME) {
                coverImage {
                    extraLarge
                }
            }
        }
    `;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), ANILIST_TIMEOUT_MS);

		const res = await fetch("https://graphql.anilist.co", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				query,
				variables: { id: anilistId },
			}),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!res.ok) {
			logger.error("AniList API Error:", res.status, await res.text());
			return null;
		}

		const json = await res.json();
		return json.data?.Media?.coverImage?.extraLarge || null;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			logger.error("AniList API Error: request timed out");
		} else {
			logger.error("AniList API Error:", error);
		}
		return null;
	}
}

export async function fetchAniListCoverByTitle(
	animeTitle: string,
): Promise<string | null> {
	const query = `
        query ($search: String) {
            Media (search: $search, type: ANIME) {
                id
                coverImage {
                    large
                }
            }
        }
    `;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), ANILIST_TIMEOUT_MS);

		const response = await fetch("https://graphql.anilist.co", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, variables: { search: animeTitle } }),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!response.ok) {
			logger.error(
				"AniList API Error (by title):",
				response.status,
				await response.text(),
			);
			return null;
		}

		const data = await response.json();
		return data?.data?.Media?.coverImage?.large || null;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			logger.error("AniList API Error (by title): request timed out");
		} else {
			logger.error("AniList API Error (by title):", error);
		}
		return null;
	}
}
