import * as fs from "node:fs/promises";
import * as process from "node:process";

const REPO = process.env.REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const ADDON_SLUG = process.env.FIREFOX_ADDON_SLUG;

interface GitHubAsset {
    download_count: number;
}

interface GitHubRelease {
    assets: GitHubAsset[];
}

interface AMOAddonResponse {
    weekly_downloads?: number;
    average_daily_users?: number;
}

async function githubDownloads(): Promise<number> {
    if (!REPO) {
        throw new Error("Environment variable REPO is required");
    }

    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "Node.js Script",
    };

    if (TOKEN) {
        headers.Authorization = `Bearer ${TOKEN}`;
    }

    let total = 0;
    let page = 1;

    while (true) {
        const url = `https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
            throw new Error(`GitHub API HTTP error! Status: ${res.status}`);
        }

        const releases = (await res.json()) as GitHubRelease[];
        if (!releases.length) {
            break;
        }

        for (const rel of releases) {
            total += rel.assets.reduce(
                (sum, asset) => sum + asset.download_count,
                0,
            );
        }

        page++;
    }

    return total;
}

async function firefoxStats(): Promise<[number, number]> {
    if (!ADDON_SLUG) {
        return [0, 0];
    }

    const url = `https://addons.mozilla.org/api/v5/addons/addon/${ADDON_SLUG}/`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`AMO API HTTP error! Status: ${res.status}`);
    }

    const data = (await res.json()) as AMOAddonResponse;
    return [data.weekly_downloads ?? 0, data.average_daily_users ?? 0];
}

function formatNum(val: number): string {
    if (val >= 1_000_000) {
        return `${(val / 1_000_000).toFixed(1)}M`;
    }
    if (val >= 1_000) {
        return `${(val / 1_000).toFixed(1)}k`;
    }
    return val.toString();
}

function buildBlock(
    ghTotal: number,
    ffWeekly: number,
    ffUsers: number,
): string {
    const ghStr = formatNum(ghTotal);
    const ffWeeklyStr = formatNum(ffWeekly);
    const ffUsersStr = formatNum(ffUsers);

    const ghBadge = `![GitHub Downloads](https://img.shields.io/badge/github_downloads-${ghStr}-blue?style=flat&labelColor=555555)`;
    const ffWeeklyBadge = `![Firefox Weekly Downloads](https://img.shields.io/badge/firefox_weekly_downloads-${ffWeeklyStr}-blue?style=flat&labelColor=555555)`;
    const ffUsersBadge = `![Firefox Active Users](https://img.shields.io/badge/firefox_active_users-${ffUsersStr}-blue?style=flat&labelColor=555555)`;

    return [
        "<!-- DOWNLOADS:START -->",
        ghBadge,
        ffWeeklyBadge,
        ffUsersBadge,
        "<!-- DOWNLOADS:END -->",
    ].join("\n");
}

async function main(): Promise<void> {
    try {
        const ghTotal = await githubDownloads();
        const [ffWeekly, ffUsers] = ADDON_SLUG ? await firefoxStats() : [0, 0];

        let readme = await fs.readFile("README.md", "utf-8");

        const pattern =
            /<!-- DOWNLOADS:START -->[\s\S]*?<!-- DOWNLOADS:END -->/;
        if (!pattern.test(readme)) {
            console.error(
                "Markers <!-- DOWNLOADS:START --> and <!-- DOWNLOADS:END --> not found in README.md",
            );
            process.exit(1);
        }

        const newBlock = buildBlock(ghTotal, ffWeekly, ffUsers);
        readme = readme.replace(pattern, newBlock);

        await fs.writeFile("README.md", readme, "utf-8");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
