import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	loginWithDiscord,
	processLocalhostRedirect,
	refreshDiscordToken,
} from "../../../src/core/discord/auth";
import { APPLICATION_ID } from "../../../src/shared/constants";

const REDIRECT = "https://abc.chromiumapp.org/";
const MOBILE_REDIRECT = "http://127.0.0.1/discord-auth";

let fetchMock: ReturnType<typeof vi.fn>;
let launchWebAuthFlow: ReturnType<typeof vi.fn>;

const tokenResponse = (body: unknown) => ({ json: async () => body });

const installIdentity = () => {
	launchWebAuthFlow = vi.fn();
	(browser as unknown as Record<string, unknown>).identity = {
		getRedirectURL: () => REDIRECT,
		launchWebAuthFlow,
	};
};
const removeIdentity = () => {
	(browser as unknown as Record<string, unknown>).identity = undefined;
};

const tokenRequestBody = () => {
	const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
	return new URLSearchParams(init.body as string);
};

const sha256b64url = async (input: string) => {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(input),
	);
	return btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(removeIdentity);

describe("loginWithDiscord (desktop: identity API available)", () => {
	beforeEach(installIdentity);

	it("runs the OAuth2 PKCE flow and stores + returns the access token status", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=AUTH_CODE`);
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "tok_abc" }));

		await expect(loginWithDiscord()).resolves.toEqual({ status: "token" });
		expect(
			(await browser.storage.local.get("discord_token")).discord_token,
		).toBe("tok_abc");
	});

	it("sends the right authorize URL (client id, scope, S256 challenge, redirect)", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=c`);
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "t" }));
		await loginWithDiscord();

		const { url, interactive } = launchWebAuthFlow.mock.calls[0]?.[0] ?? {};
		const auth = new URL(url);
		expect(auth.origin + auth.pathname).toBe(
			"https://discord.com/oauth2/authorize",
		);
		expect(interactive).toBe(true);
		expect(auth.searchParams.get("client_id")).toBe(APPLICATION_ID);
		expect(auth.searchParams.get("response_type")).toBe("code");
		expect(auth.searchParams.get("redirect_uri")).toBe(REDIRECT);
		expect(auth.searchParams.get("scope")).toBe(
			"openid sdk.social_layer_presence",
		);
		expect(auth.searchParams.get("code_challenge_method")).toBe("S256");
	});

	it("exchanges the code with a form-encoded POST including the PKCE verifier", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=AUTH_CODE`);
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "t" }));
		await loginWithDiscord();

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://discord.com/api/oauth2/token");
		expect(init.method).toBe("POST");
		expect(init.headers).toEqual({
			"Content-Type": "application/x-www-form-urlencoded",
		});

		const body = tokenRequestBody();
		expect(body.get("client_id")).toBe(APPLICATION_ID);
		expect(body.get("grant_type")).toBe("authorization_code");
		expect(body.get("code")).toBe("AUTH_CODE");
		expect(body.get("redirect_uri")).toBe(REDIRECT);
		expect(body.get("code_verifier")).toBeTruthy();
	});

	it("PKCE: the challenge in the authorize URL is the SHA-256 of the verifier sent later", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=c`);
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "t" }));
		await loginWithDiscord();

		const challenge = new URL(
			launchWebAuthFlow.mock.calls[0]?.[0].url,
		).searchParams.get("code_challenge");
		const verifier = tokenRequestBody().get("code_verifier") as string;

		expect(challenge).toBe(await sha256b64url(verifier));
		expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes, base64url, no padding
	});

	it("uses a fresh verifier for every login", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=c`);
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "t" }));
		await loginWithDiscord();
		const first = tokenRequestBody().get("code_verifier");

		fetchMock.mockClear();
		await loginWithDiscord();
		expect(tokenRequestBody().get("code_verifier")).not.toBe(first);
	});

	it.each([
		["no redirect URL comes back", undefined],
		["the redirect has no code", `${REDIRECT}?error=access_denied`],
	])("returns failure when %s", async (_label, responseUrl) => {
		launchWebAuthFlow.mockResolvedValue(responseUrl);
		await expect(loginWithDiscord()).resolves.toMatchObject({
			status: "failed",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns failure (and stores nothing) when Discord doesn't return an access_token", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=c`);
		fetchMock.mockResolvedValue(tokenResponse({ error: "invalid_grant" }));

		await expect(loginWithDiscord()).resolves.toMatchObject({
			status: "failed",
		});
		expect(
			(await browser.storage.local.get("discord_token")).discord_token,
		).toBeUndefined();
	});

	it("returns failure when the user closes the auth window", async () => {
		launchWebAuthFlow.mockRejectedValue(
			new Error("The user did not approve access."),
		);
		await expect(loginWithDiscord()).resolves.toMatchObject({
			status: "failed",
			error: "The user did not approve access.",
		});
	});

	it("returns failure when the token request fails at the network level", async () => {
		launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?code=c`);
		fetchMock.mockRejectedValue(new Error("offline"));
		await expect(loginWithDiscord()).resolves.toMatchObject({
			status: "failed",
			error: "offline",
		});
	});
});

describe("loginWithDiscord (mobile: no identity API)", () => {
	beforeEach(removeIdentity);

	it("opens the authorize page in a tab and reports pending", async () => {
		const create = vi.spyOn(browser.tabs, "create");

		await expect(loginWithDiscord()).resolves.toEqual({ status: "pending" });

		const { url } = (create.mock.calls[0]?.[0] ?? {}) as { url: string };
		const auth = new URL(url);
		expect(auth.searchParams.get("redirect_uri")).toBe(MOBILE_REDIRECT);
		expect(auth.searchParams.get("code_challenge_method")).toBe("S256");
		expect(auth.searchParams.get("client_id")).toBe(APPLICATION_ID);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("persists the verifier whose SHA-256 is the URL's code_challenge", async () => {
		const create = vi.spyOn(browser.tabs, "create");
		await loginWithDiscord();

		const { mobile_oauth_verifier } = await browser.storage.local.get(
			"mobile_oauth_verifier",
		);
		const url = new URL(
			((create.mock.calls[0]?.[0] ?? {}) as { url: string }).url,
		);
		expect(url.searchParams.get("code_challenge")).toBe(
			await sha256b64url(mobile_oauth_verifier as string),
		);
	});
});

describe("processLocalhostRedirect (mobile callback)", () => {
	beforeEach(async () => {
		await browser.storage.local.set({ mobile_oauth_verifier: "verifier-xyz" });
	});

	const storage = (key: string) =>
		browser.storage.local.get(key).then((r) => r[key]);

	it("exchanges the code, stores the token and clears the verifier", async () => {
		fetchMock.mockResolvedValue(tokenResponse({ access_token: "mobile_tok" }));

		await expect(
			processLocalhostRedirect(`${MOBILE_REDIRECT}?code=MCODE`),
		).resolves.toEqual({ success: true, token: "mobile_tok" });

		const body = tokenRequestBody();
		expect(body.get("code")).toBe("MCODE");
		expect(body.get("code_verifier")).toBe("verifier-xyz");
		expect(body.get("redirect_uri")).toBe(MOBILE_REDIRECT);
		expect(await storage("discord_token")).toBe("mobile_tok");
		expect(await storage("mobile_oauth_verifier")).toBeUndefined();
	});

	it("surfaces the OAuth error description (decoding '+' as space) and clears the verifier", async () => {
		const result = await processLocalhostRedirect(
			`${MOBILE_REDIRECT}?error=access_denied&error_description=The+resource+owner+denied+the+request`,
		);
		expect(result).toEqual({
			success: false,
			error: "The resource owner denied the request",
		});
		expect(await storage("mobile_oauth_verifier")).toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("falls back to the bare `error` param", async () => {
		const result = await processLocalhostRedirect(
			`${MOBILE_REDIRECT}?error=access_denied`,
		);
		expect(result).toEqual({ success: false, error: "access_denied" });
	});

	it("fails cleanly when no code is returned", async () => {
		const result = await processLocalhostRedirect(MOBILE_REDIRECT);
		expect(result).toEqual({
			success: false,
			error: "No authorization code was returned.",
		});
		expect(await storage("mobile_oauth_verifier")).toBeUndefined();
	});

	it("fails when the stored verifier was lost (service worker restarted)", async () => {
		await browser.storage.local.remove("mobile_oauth_verifier");
		const result = await processLocalhostRedirect(`${MOBILE_REDIRECT}?code=c`);
		expect(result).toEqual({
			success: false,
			error: "Session verifier lost. Please try logging in again.",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reports token-exchange failures and clears the verifier", async () => {
		fetchMock.mockResolvedValue(tokenResponse({ error: "invalid_grant" }));
		const result = await processLocalhostRedirect(`${MOBILE_REDIRECT}?code=c`);
		expect(result).toEqual({
			success: false,
			error: "Failed to exchange code for token.",
		});
		expect(await storage("mobile_oauth_verifier")).toBeUndefined();
		expect(await storage("discord_token")).toBeUndefined();
	});

	it("handles a malformed URL without throwing", async () => {
		const result = await processLocalhostRedirect("not a url");
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
	});
});

describe("refreshDiscordToken", () => {
	const get = (key: string) =>
		browser.storage.local.get(key).then((r) => r[key]);

	const seed = () =>
		browser.storage.local.set({
			discord_token: "old_access",
			discord_refresh_token: "old_refresh",
			discord_token_expires_at: 1,
		});

	beforeEach(seed);

	it("returns null without calling Discord when there is no refresh token", async () => {
		await browser.storage.local.remove("discord_refresh_token");
		await expect(refreshDiscordToken()).resolves.toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("stores the rotated tokens and returns the new access token", async () => {
		fetchMock.mockResolvedValue(
			tokenResponse({
				access_token: "new_access",
				refresh_token: "new_refresh",
				expires_in: 3600,
			}),
		);
		await expect(refreshDiscordToken()).resolves.toBe("new_access");
		expect(await get("discord_token")).toBe("new_access");
		expect(await get("discord_refresh_token")).toBe("new_refresh");
		expect(await get("discord_token_expires_at")).toBeGreaterThan(Date.now());

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = new URLSearchParams(init.body as string);
		expect(body.get("grant_type")).toBe("refresh_token");
		expect(body.get("refresh_token")).toBe("old_refresh");
	});

	it("keeps the old refresh token if Discord doesn't rotate it", async () => {
		fetchMock.mockResolvedValue(
			tokenResponse({ access_token: "new_access", expires_in: 3600 }),
		);
		await refreshDiscordToken();
		expect(await get("discord_refresh_token")).toBe("old_refresh");
	});

	it("shares one in-flight request between concurrent callers", async () => {
		let resolveFetch: (v: unknown) => void = () => {};
		fetchMock.mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);

		const a = refreshDiscordToken();
		const b = refreshDiscordToken();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

		resolveFetch(
			tokenResponse({
				access_token: "shared",
				refresh_token: "r2",
				expires_in: 3600,
			}),
		);
		await expect(Promise.all([a, b])).resolves.toEqual(["shared", "shared"]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("starts a new request once the previous one has settled", async () => {
		fetchMock.mockResolvedValue(
			tokenResponse({
				access_token: "t",
				refresh_token: "r",
				expires_in: 3600,
			}),
		);
		await refreshDiscordToken();
		await refreshDiscordToken();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("clears all tokens when Discord answers invalid_grant", async () => {
		fetchMock.mockResolvedValue(tokenResponse({ error: "invalid_grant" }));
		await expect(refreshDiscordToken()).resolves.toBeNull();
		expect(await get("discord_token")).toBeUndefined();
		expect(await get("discord_refresh_token")).toBeUndefined();
		expect(await get("discord_token_expires_at")).toBeUndefined();
	});

	it.each([
		[
			"a rate limit",
			{ message: "You are being rate limited.", retry_after: 1 },
		],
		["a server error", { error: "server_error" }],
		["an empty body", {}],
	])("keeps tokens on %s (transient failure)", async (_label, body) => {
		fetchMock.mockResolvedValue(tokenResponse(body));
		await expect(refreshDiscordToken()).resolves.toBeNull();
		expect(await get("discord_token")).toBe("old_access");
		expect(await get("discord_refresh_token")).toBe("old_refresh");
	});

	it("keeps tokens when the request fails at the network level", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		await expect(refreshDiscordToken()).resolves.toBeNull();
		expect(await get("discord_refresh_token")).toBe("old_refresh");
	});

	it("keeps tokens when the response isn't JSON", async () => {
		fetchMock.mockResolvedValue({
			json: async () => {
				throw new SyntaxError("Unexpected token <");
			},
		});
		await expect(refreshDiscordToken()).resolves.toBeNull();
		expect(await get("discord_refresh_token")).toBe("old_refresh");
	});

	it("does not stay stuck after a failed request", async () => {
		fetchMock.mockRejectedValueOnce(new Error("offline"));
		await refreshDiscordToken();
		fetchMock.mockResolvedValue(
			tokenResponse({ access_token: "t", refresh_token: "r", expires_in: 60 }),
		);
		await expect(refreshDiscordToken()).resolves.toBe("t");
	});
});
