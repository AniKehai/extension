import { processLocalhostRedirect } from "../../core/discord/auth";
import { MOBILE_REDIRECT_URI } from "../../shared/constants";
import { logger } from "../../shared/logger";
import { authState, gateway } from "./state";

export function setupTabListener() {
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
}

export function setupStorageListener() {
	browser.storage.onChanged.addListener((changes, areaName) => {
		if (areaName === "local" && changes.discord_token) {
			if (!changes.discord_token.newValue && changes.discord_token.oldValue) {
				if (authState.isLoggingOut) return;

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
}
