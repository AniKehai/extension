import {
	fetchAniListCoverByTitle,
	fetchAnilistCover,
} from "../../core/anilist/api";
import { fetchDiscordUser, loginWithDiscord } from "../../core/discord/auth";
import {
	activityEnabled,
	clearAnimeState,
	currentAnimeState,
	privacyEnabled,
	setActivityEnabledFlag,
	setPrivacyEnabledFlag,
} from "../../core/state/playback";
import { logger } from "../../shared/logger";
import type { RuntimeMessage } from "../../shared/types";
import {
	gateway,
	handleInfoUpdate,
	publishPresence,
	settingsReady,
	shouldUpdatePresence,
} from "./state";

export function setupMessageListener() {
	browser.runtime.onMessage.addListener(
		(message: RuntimeMessage, sender, sendResponse) => {
			const handleMessage = async () => {
				await settingsReady;

				if (message.type === "LOGIN_DISCORD") {
					await browser.storage.local.remove("auth_error");

					try {
						const result = await loginWithDiscord();
						if (result.status === "token") {
							await gateway.connect();
							sendResponse({ status: "token" });
						} else {
							sendResponse(result);
						}
					} catch (err) {
						sendResponse({
							status: "failed",
							error: err instanceof Error ? err.message : "Error",
						});
					}
					return;
				}

				if (message.type === "FETCH_DISCORD_USER") {
					const user = await fetchDiscordUser();
					sendResponse({ user });
					return;
				}

				if (message.type === "LOGOUT_DISCORD") {
					const { authState, activityTimeout } = await import("./state");
					if (authState.isLoggingOut) return;

					if (currentAnimeState.title !== null) {
						try {
							await gateway.setActivity({
								type: "STOPPED",
								...currentAnimeState,
							});
						} catch (err) {
							logger.error("[setActivity/logout]", err);
						}
					}

					if (activityTimeout) clearTimeout(activityTimeout);
					clearAnimeState();

					gateway.disconnect();

					authState.isLoggingOut = true;
					try {
						await browser.storage.local.remove([
							"discord_token",
							"discord_refresh_token",
							"discord_token_expires_at",
						]);
					} finally {
						authState.isLoggingOut = false;
					}
					sendResponse({ success: true });
					return;
				}

				if (message.type === "SET_ACTIVITY_ENABLED") {
					setActivityEnabledFlag(!!message.enabled);
					await browser.storage.local.set({
						activity_enabled: activityEnabled,
					});
					if (!activityEnabled) {
						const { activityTimeout } = await import("./state");
						if (activityTimeout) clearTimeout(activityTimeout);
						if (currentAnimeState.title !== null) {
							gateway
								.setActivity({ type: "STOPPED", ...currentAnimeState })
								.catch((err) => logger.error("[setActivity/toggle]", err));
						}
						clearAnimeState();
					}
					sendResponse({ success: true });
					return;
				}

				if (message.type === "SET_PRIVACY_ENABLED") {
					setPrivacyEnabledFlag(!!message.enabled);
					await browser.storage.local.set({ privacy_enabled: privacyEnabled });

					if (!activityEnabled) {
						sendResponse({ success: true });
						return;
					}

					publishPresence("setPrivacy/toggle");
					sendResponse({ success: true });
					return;
				}

				if (message.type === "GET_STATUS") {
					const storage = await browser.storage.local.get([
						"discord_token",
						"auth_error",
					]);
					sendResponse({
						hasToken:
							typeof storage.discord_token === "string" &&
							!!storage.discord_token,
						isGatewayReady: gateway.isConnected(),
						activityEnabled,
						privacyEnabled,
						authError: storage.auth_error || null,
						currentAnime:
							currentAnimeState.title !== null ? currentAnimeState : null,
					});
					return;
				}

				if (!sender.tab?.active) return;

				if (message.type === "STOPPED") {
					if (currentAnimeState.title !== null) {
						gateway
							.setActivity({ type: "STOPPED", ...currentAnimeState })
							.catch((err) => logger.error("[setActivity/stopped]", err));
					}
					const { activityTimeout } = await import("./state");
					if (activityTimeout) clearTimeout(activityTimeout);
					clearAnimeState();
					return;
				}

				if (message.type === "FETCH_ANILIST") {
					const coverUrl = await fetchAnilistCover(message.anilistId);
					sendResponse({ coverUrl });
					return;
				}

				if (message.type === "FETCH_ANILIST_BY_TITLE") {
					const coverUrl = await fetchAniListCoverByTitle(message.title);
					sendResponse({ coverUrl });
					return;
				}

				if (handleInfoUpdate(message)) {
					shouldUpdatePresence(message);
					return;
				}
			};

			handleMessage();

			if (
				message.type === "LOGIN_DISCORD" ||
				message.type === "LOGOUT_DISCORD" ||
				message.type === "SET_ACTIVITY_ENABLED" ||
				message.type === "SET_PRIVACY_ENABLED" ||
				message.type === "GET_STATUS" ||
				message.type === "FETCH_ANILIST" ||
				message.type === "FETCH_ANILIST_BY_TITLE" ||
				message.type === "FETCH_DISCORD_USER"
			) {
				return true;
			}
		},
	);
}
