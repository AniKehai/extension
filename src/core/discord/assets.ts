import { APPLICATION_ID } from "../../shared/constants";
import { logger } from "../../shared/logger";

async function registerExternalAsset(url: string): Promise<string | null> {
    const storage = await browser.storage.local.get("discord_token");
    const token =
        typeof storage.discord_token === "string"
            ? storage.discord_token
            : null;

    if (!token) return null;

    const res = await fetch(
        `https://discord.com/api/v10/applications/${APPLICATION_ID}/external-assets`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ urls: [url] }),
        },
    );

    if (!res.ok) {
        logger.error("[ExternalAssets] failed:", res.status, await res.text());
        return null;
    }

    const data = await res.json();
    const path = data?.[0]?.external_asset_path;
    return path ? `mp:${path}` : null;
}

const assetCache = new Map<string, string>();

export async function getLargeImageKey(
    coverUrl: string,
): Promise<string | undefined> {
    const cached = assetCache.get(coverUrl);
    if (cached) return cached;

    const key = await registerExternalAsset(coverUrl);
    if (key) {
        assetCache.set(coverUrl, key);
        return key;
    }

    return getAppAssetId("default_cover");
}

let appAssetIds: Map<string, string> | null = null;

export async function getAppAssetId(name: string): Promise<string | undefined> {
    if (!appAssetIds) {
        try {
            const res = await fetch(
                `https://discord.com/api/v10/oauth2/applications/${APPLICATION_ID}/assets`,
            );
            if (!res.ok) {
                logger.error(
                    "[Assets] list failed:",
                    res.status,
                    await res.text(),
                );
                return undefined;
            }
            const list: { id: string; name: string }[] = await res.json();
            appAssetIds = new Map(list.map((a) => [a.name, a.id]));
        } catch (e) {
            logger.error("[Assets] list error:", e);
            return undefined;
        }
    }
    return appAssetIds.get(name);
}
