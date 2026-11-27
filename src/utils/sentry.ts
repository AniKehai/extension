import type { ErrorEvent } from "@sentry/browser";
import { BrowserClient, Scope } from "@sentry/browser";
import { logger } from "@/shared/logger";

const DSN = import.meta.env.WXT_SENTRY_DSN;

if (!DSN) {
    logger.warn("[sentry] WXT_SENTRY_DSN is not set — Sentry will no-op");
}

let client: BrowserClient | null = null;
let scope: Scope | null = null;

function serializeEnvelope(envelope: unknown): string {
    const lines: string[] = [];
    function process(item: unknown) {
        if (Array.isArray(item)) {
            for (const subItem of item) {
                process(subItem);
            }
        } else {
            lines.push(typeof item === "string" ? item : JSON.stringify(item));
        }
    }
    process(envelope);
    return lines.join("\n");
}

function normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(typeof error === "string" ? error : String(error));
}

export function initSentry(
    entrypoint: "background" | "content" | "popup",
): void {
    if (!DSN) return;

    logger.log("[sentry] Initializing for entrypoint:", entrypoint);

    client = new BrowserClient({
        dsn: DSN as string,
        integrations: [],
        transport: (options: { url: string }) => {
            const url = options.url;
            return {
                send: async (envelope: BodyInit) => {
                    logger.log("[sentry] Transport sending envelope to:", url);
                    try {
                        const body =
                            typeof envelope === "string"
                                ? envelope
                                : serializeEnvelope(envelope);
                        const response = await fetch(url, {
                            method: "POST",
                            body: body,
                            headers: {
                                "Content-Type": "application/x-sentry-envelope",
                            },
                        });
                        logger.log(
                            "[sentry] Transport response status:",
                            response.status,
                        );
                        const responseBody = await response
                            .text()
                            .catch(() => "<no body>");
                        logger.log(
                            "[sentry] Transport response body:",
                            responseBody,
                        );
                        return {
                            status: response.status,
                            headers: response.headers,
                        };
                    } catch {
                        logger.error("[sentry] Transport fetch failed");
                        return { status: 0, headers: {} };
                    }
                },
                flush: () => Promise.resolve(true),
            };
        },
        beforeSend: (event: ErrorEvent) => {
            if (event.request?.url) {
                try {
                    event.request.url = new URL(event.request.url).origin;
                } catch {
                    // ignore malformed URLs
                }
            }
            return event;
        },
    } as unknown as ConstructorParameters<typeof BrowserClient>[0]);

    scope = new Scope();
    scope.setTag("entrypoint", entrypoint);
}

export function setSentryUser(
    _discordUser: { id: string; username?: string } | null,
): void {
    // Intentionally no-op: Discord user data is not sent to Sentry.
    // Keeps callers (messages.ts, useExtensionStatus.ts) compiling without change.
}

export function captureError(
    error: unknown,
    context: {
        entrypoint: "background" | "content" | "popup";
        site?: string;
        action?: string;
        extra?: Record<string, unknown>;
    },
): void {
    if (!client || !DSN) {
        logger.warn(
            "[sentry] captureError called but client not initialized or no DSN",
        );
        return;
    }

    logger.log("[sentry] Capturing error:", context.action, context.entrypoint);

    const captureScope = new Scope();
    captureScope.setTag("entrypoint", context.entrypoint);
    if (context.site) captureScope.setTag("site", context.site);
    if (context.action) captureScope.setTag("action", context.action);
    if (context.extra) captureScope.setExtras(context.extra);

    client.captureException(normalizeError(error), undefined, captureScope);
    logger.log("[sentry] captureException called successfully");
}
