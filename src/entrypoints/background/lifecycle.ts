import { logger } from "../../shared/logger";
import { reinjectContentScripts } from "./state";

export function setupLifecycleListeners() {
	browser.runtime.onInstalled.addListener(async (details) => {
		if (details.reason === "install") {
			browser.tabs.create({
				url: browser.runtime.getURL("/welcome.html"),
				active: true,
			});
		} else if (details.reason === "update") {
			const currentVersion = browser.runtime.getManifest().version;
			const stored = await browser.storage.local.get("lastSeenVersion");
			const lastSeenVersion = stored.lastSeenVersion;

			if (lastSeenVersion !== currentVersion) {
				await browser.storage.local.set({ lastSeenVersion: currentVersion });
				browser.tabs.create({
					url: browser.runtime.getURL("/changelog.html"),
					active: true,
				});
			}
		}

		if (details.reason === "install" || details.reason === "update") {
			reinjectContentScripts().catch((err) => logger.error("[reinject]", err));
		}
	});
}
