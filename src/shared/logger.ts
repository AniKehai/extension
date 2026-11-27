let isEnabled = false;

if (typeof browser !== "undefined" && browser.storage) {
    browser.storage.local.get("enable_logs").then((res) => {
        isEnabled = !!res.enable_logs;
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.enable_logs) {
            isEnabled = Boolean(changes.enable_logs.newValue);
        }
    });

    Object.defineProperty(globalThis, "enable_logs", {
        get: () => isEnabled,
        set: (value: boolean) => {
            isEnabled = value;
            browser.storage.local.set({ enable_logs: value });
            console.log(
                `%c[AniKehai] Developer logging ${value ? "ENABLED" : "DISABLED"}`,
                "color: #22d3ee; font-weight: bold;",
            );
        },
        configurable: true,
    });
}

const evaluate = (arg: unknown) => (typeof arg === "function" ? arg() : arg);

export const logger = {
    get isEnabled() {
        return isEnabled;
    },
    log: (...args: unknown[]) => {
        if (isEnabled) {
            console.log("[INFO]", ...args.map(evaluate));
        }
    },
    warn: (...args: unknown[]) => {
        console.warn("[WARN]", ...args.map(evaluate));
    },
    error: (...args: unknown[]) => {
        console.error("[ERROR]", ...args.map(evaluate));
    },
};
