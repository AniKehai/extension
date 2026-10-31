import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	fetchAniListCoverByTitle,
	fetchAnilistCover,
} from "../../../src/core/anilist/api";

const jsonResponse = (body: unknown) => ({
	ok: true,
	json: async () => body,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
});

describe("fetchAnilistCover", () => {
	it("returns the extraLarge cover URL", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				data: { Media: { coverImage: { extraLarge: "https://s4/cover.jpg" } } },
			}),
		);
		await expect(fetchAnilistCover(1)).resolves.toBe("https://s4/cover.jpg");
	});

	it("POSTs a GraphQL query to the AniList endpoint with the id variable", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		await fetchAnilistCover(154587);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://graphql.anilist.co");
		expect(init.method).toBe("POST");
		expect(init.headers).toMatchObject({
			"Content-Type": "application/json",
			Accept: "application/json",
		});

		const body = JSON.parse(init.body as string);
		expect(body.variables).toEqual({ id: 154587 });
		expect(body.query).toContain("coverImage");
		expect(body.query).toContain("type: ANIME");
	});

	it.each([
		["media not found", { data: { Media: null } }],
		["no data key", {}],
		["no coverImage", { data: { Media: {} } }],
		[
			"empty cover string",
			{ data: { Media: { coverImage: { extraLarge: "" } } } },
		],
		["GraphQL errors only", { errors: [{ message: "Not Found" }] }],
	])("returns null when %s", async (_label, body) => {
		fetchMock.mockResolvedValue(jsonResponse(body));
		await expect(fetchAnilistCover(1)).resolves.toBeNull();
	});

	it("returns null when the network request rejects", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		await expect(fetchAnilistCover(1)).resolves.toBeNull();
	});

	it("returns null when the response body is not valid JSON", async () => {
		fetchMock.mockResolvedValue({
			json: async () => {
				throw new SyntaxError("Unexpected token <");
			},
		});
		await expect(fetchAnilistCover(1)).resolves.toBeNull();
	});
});

describe("fetchAniListCoverByTitle", () => {
	it("returns the large cover URL", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				data: { Media: { coverImage: { large: "https://s4/cover.jpg" } } },
			}),
		);
		await expect(fetchAniListCoverByTitle("One Piece")).resolves.toBe(
			"https://s4/cover.jpg",
		);
	});

	it("POSTs a GraphQL query to the AniList endpoint with the search variable", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}));
		await fetchAniListCoverByTitle("One Piece");

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://graphql.anilist.co");
		expect(init.method).toBe("POST");
		expect(init.headers).toMatchObject({
			"Content-Type": "application/json",
		});

		const body = JSON.parse(init.body as string);
		expect(body.variables).toEqual({ search: "One Piece" });
		expect(body.query).toContain("coverImage");
		expect(body.query).toContain("type: ANIME");
	});

	it.each([
		["media not found", { data: { Media: null } }],
		["no data key", {}],
		["no coverImage", { data: { Media: {} } }],
		["empty cover string", { data: { Media: { coverImage: { large: "" } } } }],
		["GraphQL errors only", { errors: [{ message: "Not Found" }] }],
	])("returns null when %s", async (_label, body) => {
		fetchMock.mockResolvedValue(jsonResponse(body));
		await expect(fetchAniListCoverByTitle("One Piece")).resolves.toBeNull();
	});

	it("returns null when the network request rejects", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		await expect(fetchAniListCoverByTitle("One Piece")).resolves.toBeNull();
	});

	it("returns null when the response body is not valid JSON", async () => {
		fetchMock.mockResolvedValue({
			json: async () => {
				throw new SyntaxError("Unexpected token <");
			},
		});
		await expect(fetchAniListCoverByTitle("One Piece")).resolves.toBeNull();
	});
});
