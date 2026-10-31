import {
	fetchAniListCoverByTitle,
	fetchAnilistCover,
} from "../core/anilist/api";
import {
	loginWithDiscord,
	processLocalhostRedirect,
} from "../core/discord/auth";
import { DiscordGateway } from "../core/discord/gateway";
import {
	activityEnabled,
	clearAnimeState,
	commitBroadcast,
	currentAnimeState,
	evaluateDiscordUpdate,
	privacyEnabled,
	setActivityEnabledFlag,
	setPrivacyEnabledFlag,
} from "../core/state/playback";
import {
	MOBILE_REDIRECT_URI,
	RESET_ACTIVITY_TIMEOUT,
} from "../shared/constants";
import { logger } from "../shared/logger";
import type { RuntimeMessage } from "../shared/types";

export default defineBackground(() => {
	const gateway = new DiscordGateway();
	gateway.connect();

	let activityTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoggingOut = false;

	const settingsReady = browser.storage.local
		.get(["activity_enabled", "privacy_enabled"])
		.then((storage) => {
			if (typeof storage.activity_enabled === "boolean") {
				setActivityEnabledFlag(storage.activity_enabled);
			}
			if (typeof storage.privacy_enabled === "boolean") {
				setPrivacyEnabledFlag(storage.privacy_enabled);
			}
		});

	function publishPresence(context: string) {
		if (currentAnimeState.title === null) return;

		const type = currentAnimeState.isPaused
			? ("PAUSED" as const)
			: ("WATCHING" as const);

		if (privacyEnabled) {
			gateway
				.setActivity({
					type,
					title: "Anime",
					episode: "Private Session",
					coverUrl: "",
					currentMs: 0,
					durationMs: 0,
					isPaused: currentAnimeState.isPaused,
				})
				.catch((err) => logger.error(`[${context}]`, err));
		} else {
			gateway
				.setActivity({
					type,
					...currentAnimeState,
				})
				.catch((err) => logger.error(`[${context}]`, err));
		}
	}

	function resetActivityTimeout() {
		if (activityTimeout) clearTimeout(activityTimeout);
		activityTimeout = setTimeout(() => {
			if (currentAnimeState.title !== null) {
				gateway
					.setActivity({ type: "STOPPED", ...currentAnimeState })
					.catch((err) => logger.error("[setActivity/timeout]", err));
			}
			clearAnimeState();
		}, RESET_ACTIVITY_TIMEOUT * 1000);
	}

	async function reinjectContentScripts() {
		const { content_scripts: contentScripts = [] } =
			browser.runtime.getManifest();

		for (const cs of contentScripts) {
			if (!cs.js?.length || !cs.matches?.length) continue;

			const tabs = await browser.tabs.query({ url: cs.matches });
			for (const tab of tabs) {
				if (tab.id === undefined) continue;

				browser.scripting
					.executeScript({
						target: { tabId: tab.id, allFrames: cs.all_frames ?? false },
						files: cs.js as never,
					})
					.catch((err) => logger.warn("[reinject]", tab.url, err));
			}
		}
	}

	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason === "install") {
			browser.tabs.create({
				url: browser.runtime.getURL("/popup.html"),
				active: true,
			});
		}

		if (details.reason === "install" || details.reason === "update") {
			reinjectContentScripts().catch((err) => logger.error("[reinject]", err));
		}
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		const targetUrl = changeInfo.url || tab.url;
		if (!targetUrl) return;

		let parsed: URL;
		try {
			parsed = new URL(targetUrl);
		} catch {
			return;
		}

		const redirectUri = new URL(MOBILE_REDIRECT_URI);
		if (
			parsed.protocol !== redirectUri.protocol ||
			parsed.hostname !== redirectUri.hostname ||
			parsed.pathname !== redirectUri.pathname
		) {
			return;
		}

		browser.tabs.remove(tabId).catch(() => {});

		processLocalhostRedirect(targetUrl).then(async (result) => {
			if (result.success && result.token) {
				await browser.storage.local.remove("auth_error");
				await gateway.connect();
			} else if (!result.success && result.error) {
				await browser.storage.local.set({ auth_error: result.error });
			}
		});
	});

	browser.storage.onChanged.addListener((changes, areaName) => {
		if (areaName === "local" && changes.discord_token) {
			if (!changes.discord_token.newValue && changes.discord_token.oldValue) {
				if (isLoggingOut) return;

				logger.warn("Discord token expired or removed. Prompting for re-auth.");

				if (browser.action?.openPopup) {
					browser.action.openPopup().catch((err) => {
						logger.warn(
							"Popup blocked by browser security, falling back to tab.",
							err,
						);
						browser.tabs.create({
							url: browser.runtime.getURL("/popup.html"),
							active: true,
						});
					});
				} else {
					browser.tabs.create({
						url: browser.runtime.getURL("/popup.html"),
						active: true,
					});
				}
			}
		}
	});

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

				if (message.type === "LOGOUT_DISCORD") {
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
					isLoggingOut = true;
					try {
						await browser.storage.local.remove([
							"discord_token",
							"discord_refresh_token",
							"discord_token_expires_at",
						]);
					} finally {
						isLoggingOut = false;
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

				if (message.type === "INFO_UPDATE") {
					currentAnimeState.title = message.title;
					currentAnimeState.episode = message.episode;
					currentAnimeState.episodeName = message.episodeName ?? undefined;
					currentAnimeState.coverUrl = message.coverUrl ?? "";
				} else if (message.type === "TIME_UPDATE") {
					currentAnimeState.currentMs = message.currentMs;
					currentAnimeState.durationMs = message.durationMs;
					currentAnimeState.isPaused = message.isPaused;
				} else {
					return;
				}

				if (!activityEnabled) return;
				resetActivityTimeout();

				const { shouldUpdate, newEstimatedStart } = evaluateDiscordUpdate(
					message.type,
				);

				if (!shouldUpdate) return;
				commitBroadcast(newEstimatedStart);

				publishPresence("setActivity/update");
			};

			handleMessage();

			if (
				message.type === "LOGIN_DISCORD" ||
				message.type === "LOGOUT_DISCORD" ||
				message.type === "SET_ACTIVITY_ENABLED" ||
				message.type === "SET_PRIVACY_ENABLED" ||
				message.type === "GET_STATUS" ||
				message.type === "FETCH_ANILIST" ||
				message.type === "FETCH_ANILIST_BY_TITLE"
			) {
				return true;
			}
		},
	);
});
