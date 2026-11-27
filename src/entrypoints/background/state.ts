import { DiscordGateway } from "../../core/discord/gateway";
import {
    activityEnabled,
    clearAnimeState,
    commitBroadcast,
    currentAnimeState,
    evaluateDiscordUpdate,
    privacyEnabled,
    setActivityEnabledFlag,
    setPrivacyEnabledFlag,
} from "../../core/state/playback";
import {
    CHECK_ACTIVITY_INTERVAL,
    RESET_ACTIVITY_TIMEOUT,
} from "../../shared/constants";
import { logger } from "../../shared/logger";
import type { RuntimeMessage } from "../../shared/types";

export const gateway = new DiscordGateway();

export let activityTimeout: ReturnType<typeof setTimeout> | null = null;

export const authState = {
    isLoggingOut: false,
};

export const settingsState = {
    resetActivityTimeout: RESET_ACTIVITY_TIMEOUT,
    checkActivityInterval: CHECK_ACTIVITY_INTERVAL,
};

export const settingsReady = browser.storage.local
    .get([
        "activity_enabled",
        "privacy_enabled",
        "reset_activity_timeout",
        "check_activity_interval",
    ])
    .then((storage) => {
        if (typeof storage.activity_enabled === "boolean") {
            setActivityEnabledFlag(storage.activity_enabled);
        }
        if (typeof storage.privacy_enabled === "boolean") {
            setPrivacyEnabledFlag(storage.privacy_enabled);
        }
        if (typeof storage.reset_activity_timeout === "number") {
            settingsState.resetActivityTimeout = storage.reset_activity_timeout;
        }
        if (typeof storage.check_activity_interval === "number") {
            settingsState.checkActivityInterval =
                storage.check_activity_interval;
        }
    });

export function publishPresence(context: string) {
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

export function resetActivityTimeout() {
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
        if (currentAnimeState.title !== null) {
            gateway
                .setActivity({ type: "STOPPED", ...currentAnimeState })
                .catch((err) => logger.error("[setActivity/timeout]", err));
        }
        clearAnimeState();
    }, settingsState.resetActivityTimeout * 1000);
}

export async function reinjectContentScripts() {
    const { content_scripts: contentScripts = [] } =
        browser.runtime.getManifest();

    for (const cs of contentScripts) {
        if (!cs.js?.length || !cs.matches?.length) continue;

        const tabs = await browser.tabs.query({ url: cs.matches });
        for (const tab of tabs) {
            if (tab.id === undefined) continue;

            browser.scripting
                .executeScript({
                    target: {
                        tabId: tab.id,
                        allFrames: cs.all_frames ?? false,
                    },
                    files: cs.js as never,
                })
                .catch((err) => logger.warn("[reinject]", tab.url, err));
        }
    }
}

export function handleInfoUpdate(message: RuntimeMessage) {
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
        return false;
    }
    return true;
}

export function shouldUpdatePresence(message: RuntimeMessage) {
    if (message.type !== "INFO_UPDATE" && message.type !== "TIME_UPDATE") {
        return false;
    }
    if (!activityEnabled) return false;
    resetActivityTimeout();

    const { shouldUpdate, newEstimatedStart } = evaluateDiscordUpdate(
        message.type,
    );
    if (!shouldUpdate) return false;

    commitBroadcast(newEstimatedStart);
    publishPresence("setActivity/update");
    return true;
}
