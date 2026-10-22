import { APPLICATION_ID, MOBILE_REDIRECT_URI } from "../../shared/constants";
import { logger } from "../../shared/logger";
import type { LoginResponse } from "../../shared/types";

function base64Url(bytes: Uint8Array | ArrayBuffer) {
	return btoa(String.fromCharCode(...new Uint8Array(bytes)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function generateCodeVerifier() {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64Url(array);
}

async function generateCodeChallenge(verifier: string) {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return base64Url(digest);
}

function buildAuthUrl(redirectUri: string, challenge: string) {
	const authUrl = new URL("https://discord.com/oauth2/authorize");
	authUrl.searchParams.set("client_id", APPLICATION_ID);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("redirect_uri", redirectUri);
	authUrl.searchParams.set("scope", "openid sdk.social_layer_presence");
	authUrl.searchParams.set("code_challenge", challenge);
	authUrl.searchParams.set("code_challenge_method", "S256");
	return authUrl.toString();
}

export async function loginWithDiscord(): Promise<LoginResponse> {
	try {
		const verifier = generateCodeVerifier();
		const challenge = await generateCodeChallenge(verifier);

		if (browser?.identity?.getRedirectURL) {
			const redirectUri = browser.identity.getRedirectURL();

			const responseUrl = await browser.identity.launchWebAuthFlow({
				url: buildAuthUrl(redirectUri, challenge),
				interactive: true,
			});
			if (!responseUrl) throw new Error("No response url generated.");
			const code = new URL(responseUrl).searchParams.get("code");
			if (!code) throw new Error("No authorization code returned.");

			await exchangeCodeForToken(code, redirectUri, verifier);
			return { status: "token" };
		} else {
			await browser.storage.local.set({ mobile_oauth_verifier: verifier });
			await browser.tabs.create({
				url: buildAuthUrl(MOBILE_REDIRECT_URI, challenge),
			});

			return { status: "pending" };
		}
	} catch (error) {
		logger.error("Auth Error:", error);
		return {
			status: "failed",
			error: error instanceof Error ? error.message : "Auth Error",
		};
	}
}

async function exchangeCodeForToken(
	code: string,
	redirectUri: string,
	verifier: string,
) {
	const body = new URLSearchParams({
		client_id: APPLICATION_ID,
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		code_verifier: verifier,
	});

	const res = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	const data = await res.json();
	if (data.access_token) {
		const expiresAt = Date.now() + data.expires_in * 1000;
		await browser.storage.local.set({
			discord_token: data.access_token,
			discord_refresh_token: data.refresh_token,
			discord_token_expires_at: expiresAt,
		});
		return data.access_token;
	}
	throw new Error("Failed to exchange code for token.");
}

const TOKEN_KEYS = [
	"discord_token",
	"discord_refresh_token",
	"discord_token_expires_at",
];

let inFlightRefresh: Promise<string | null> | null = null;

export function refreshDiscordToken(): Promise<string | null> {
	if (!inFlightRefresh) {
		inFlightRefresh = performRefresh().finally(() => {
			inFlightRefresh = null;
		});
	}
	return inFlightRefresh;
}

async function performRefresh(): Promise<string | null> {
	const storage = await browser.storage.local.get("discord_refresh_token");
	const refreshToken = storage.discord_refresh_token;
	if (typeof refreshToken !== "string" || !refreshToken) return null;

	const body = new URLSearchParams({
		client_id: APPLICATION_ID,
		grant_type: "refresh_token",
		refresh_token: refreshToken,
	});

	try {
		const res = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
		const data = await res.json();

		if (data.access_token) {
			const expiresAt = Date.now() + data.expires_in * 1000;
			await browser.storage.local.set({
				discord_token: data.access_token,
				discord_refresh_token: data.refresh_token ?? refreshToken,
				discord_token_expires_at: expiresAt,
			});
			return data.access_token;
		}

		if (data.error === "invalid_grant") {
			logger.error("Token Refresh: refresh token rejected. Clearing tokens.");
			await browser.storage.local.remove(TOKEN_KEYS);
		} else {
			logger.error("Token Refresh failed (tokens kept):", res.status, data);
		}
		return null;
	} catch (error) {
		logger.error("Token Refresh Error:", error);
		return null;
	}
}

export async function processLocalhostRedirect(
	urlStr: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
	try {
		const url = new URL(urlStr);

		const errorParam =
			url.searchParams.get("error_description") ||
			url.searchParams.get("error");
		if (errorParam) {
			await browser.storage.local.remove("mobile_oauth_verifier");
			return {
				success: false,
				error: decodeURIComponent(errorParam.replace(/\+/g, " ")),
			};
		}

		const code = url.searchParams.get("code");
		if (!code) {
			await browser.storage.local.remove("mobile_oauth_verifier");
			return {
				success: false,
				error: "No authorization code was returned.",
			};
		}

		const storage = await browser.storage.local.get("mobile_oauth_verifier");
		const verifier = storage.mobile_oauth_verifier as string;

		if (!verifier || typeof verifier !== "string") {
			return {
				success: false,
				error: "Session verifier lost. Please try logging in again.",
			};
		}

		const token = await exchangeCodeForToken(
			code,
			MOBILE_REDIRECT_URI,
			verifier,
		);
		await browser.storage.local.remove("mobile_oauth_verifier");

		return { success: true, token };
	} catch (e) {
		logger.error("Mobile Exchange Error:", e);
		await browser.storage.local.remove("mobile_oauth_verifier");
		const message =
			e instanceof Error ? e.message : "Failed to exchange authorization code.";
		return { success: false, error: message };
	}
}
