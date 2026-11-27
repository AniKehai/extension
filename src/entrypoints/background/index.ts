// import { setupLifecycleListeners } from "./lifecycle";

import { refreshDiscordUserOnStartup } from "@/core/discord/auth";
import { logger } from "@/shared/logger";
import { captureError, initSentry } from "@/utils/sentry";
import { setupStorageListener, setupTabListener } from "./listeners";
import { setupMessageListener } from "./messages";
import { gateway } from "./state";

export default defineBackground(() => {
    initSentry("background");

    self.addEventListener("error", (event) => {
        captureError(
            event.error ?? new Error(event.message ?? "Unknown error"),
            {
                entrypoint: "background",
                action: "uncaught_error",
            },
        );
    });

    self.addEventListener("unhandledrejection", (event) => {
        captureError(event.reason, {
            entrypoint: "background",
            action: "unhandled_rejection",
        });
    });

    gateway.connect();

    // setupLifecycleListeners();
    setupTabListener();
    setupStorageListener();
    setupMessageListener();

    refreshDiscordUserOnStartup().catch((error) => {
        logger.error("Background startup: Discord user refresh failed", error);
    });
});
