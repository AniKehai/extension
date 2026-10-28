# AniKehai

<div align="center">
    <img src="./.github/assets/discord-activity.png" width="400" height="auto" alt="discord-activity">
</div>

A lightweight, standalone browser extension that shows the anime you are watching on your Discord profile (Rich Presence). No desktop app needed.

<div align="center">

[![Website](https://img.shields.io/badge/website-anikehai.vercel.app-7c5cff?style=flat&logo=vercel)](https://anikehai.vercel.app/)
![Stars](https://img.shields.io/github/stars/minkxx/AniKehai?style=flat)
![Forks](https://img.shields.io/github/forks/minkxx/AniKehai?style=flat)
![Version](https://img.shields.io/github/v/release/minkxx/AniKehai?style=flat)

<!-- DOWNLOADS:START -->
![GitHub Downloads](https://img.shields.io/badge/github_downloads-210-blue?style=flat&labelColor=555555)
![Firefox Weekly Downloads](https://img.shields.io/badge/firefox_weekly_downloads-9-blue?style=flat&labelColor=555555)
![Firefox Active Users](https://img.shields.io/badge/firefox_active_users-25-blue?style=flat&labelColor=555555)
<!-- DOWNLOADS:END -->

<a href="https://discord.gg/w9Q7YUrzpn"><img src="https://invidget.switchblade.xyz/w9Q7YUrzpn"></a>

</div>

Website: [anikehai.vercel.app](https://anikehai.vercel.app/) has install guides, the supported-site list and an FAQ.

---

## Install

**Firefox (Desktop & Android)**
Open the [Firefox Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/anikehai/) and click **Add to Firefox**.

**Chrome / Edge (Desktop)**
Not in the Chrome Web Store yet, so install it by hand:

1. Download the `chrome` zip (or the `edge` zip for Edge) from the [latest release](https://github.com/minkxx/AniKehai/releases/latest).
2. Unzip it into a normal folder.
3. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
4. Click **Load unpacked** and pick the unzipped folder.

**Android (Kiwi / Lemur)**

1. Install [Kiwi Browser](https://github.com/kiwibrowser/src.next/releases/tag/14310011181).
2. Download the `chrome` zip from the [latest release](https://github.com/minkxx/AniKehai/releases/latest) to your phone.
3. In Kiwi, open the menu (⋮) → **Extensions** and turn on **Developer mode**.
4. Tap **+ (from .zip/.crx/.user.js)** and pick the zip.

**Then**

1. Open the extension popup and click **Link with Discord**.
2. Open an episode on a [supported site](https://anikehai.vercel.app/#sites). Your status updates by itself.

> Keep Discord open (app or website) with the same account you linked.

## Features

- **Rich Presence:** title, episode, episode name, and Watching / Paused.
- **Progress bar:** elapsed and remaining time through Discord timestamps.
- **Cover art:** sites with protected images (like AnimePahe) use the AniList API.
- **Privacy mode:** Discord only shows "Anime - Private Session".
- **Broadcast toggle:** turn sharing off without logging out.
- **No middleman:** the extension talks directly to Discord. Nothing runs outside your browser.

## Contributing

Bug reports, new sites, docs and code are all welcome.

```bash
git clone https://github.com/minkxx/AniKehai.git
cd AniKehai
docker compose up --build dev
```

| I want to...                         | Read                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| Set up (Docker or manual), run tests | [docs/development.md](./docs/development.md)         |
| Understand the code                  | [docs/how-it-works.md](./docs/how-it-works.md)       |
| Add a streaming site                 | [docs/adding-a-site.md](./docs/adding-a-site.md)     |
| Fix a problem                        | [docs/troubleshooting.md](./docs/troubleshooting.md) |
| Know the rules for a PR              | [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md) |

## License

Distributed under the [MIT License](/LICENSE).

<p align="center">Made with ❤️ by Minkxx</p>
