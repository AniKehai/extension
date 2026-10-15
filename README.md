# AniKehai

<div align="center">
    <img src="./.github/assets/discord-activity.png" width="400" height="auto" alt="discord-activity">
</div>

A lightweight, purely standalone browser extension that natively broadcasts the anime you are watching directly to your Discord Rich Presence.

<div align="center">

[![Website](https://img.shields.io/badge/website-anikehai.vercel.app-7c5cff?style=flat&logo=vercel)](https://anikehai.vercel.app/)
![Stars](https://img.shields.io/github/stars/minkxx/AniKehai?style=flat)
![Forks](https://img.shields.io/github/forks/minkxx/AniKehai?style=flat)
![Version](https://img.shields.io/badge/version-v2.6.0-blue?style=flat&labelColor=#808080)

<!-- DOWNLOADS:START -->
![GitHub Downloads](https://img.shields.io/badge/github_downloads-188-blue?style=flat&labelColor=555555)
![Firefox Weekly Downloads](https://img.shields.io/badge/firefox_weekly_downloads-12-blue?style=flat&labelColor=555555)
![Firefox Active Users](https://img.shields.io/badge/firefox_active_users-20-blue?style=flat&labelColor=555555)
<!-- DOWNLOADS:END -->

<a href="https://discord.gg/w9Q7YUrzpn"><img src="https://invidget.switchblade.xyz/w9Q7YUrzpn"></a>

</div>

🌐 **Official Website:** Visit [anikehai.vercel.app](https://anikehai.vercel.app/) for automatic browser detection, step-by-step install guides, full supported site details, and FAQ.

---

## How to use

AniKehai can be easily used by simply installing the extension and linking your Discord account. You can visit the [official website](https://anikehai.vercel.app/) for an automated install guide tailored to your browser, or follow the manual steps below:

**If you use Firefox (Desktop & Android):**
It's super easy! Just go to the [Firefox Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/anikehai/) and click **"Add to Firefox"**.

**If you use Chrome (Desktop):**
We aren't in the Chrome Web Store just yet, so follow these simple steps:

1. Go to the [Releases page](https://github.com/minkxx/AniKehai/releases) and download `anikehai-2.6.0-chrome.zip`.
2. **Extract (unzip)** that file into a regular folder on your computer.
3. Open Google Chrome and type `chrome://extensions` into the top web address bar and press Enter.
4. Look at the top-right corner of the screen and turn **ON** the switch for **Developer mode**.
5. Click the **Load unpacked** button that appears on the top left.
6. Select the folder you just unzipped. You're done!

**If you use an Android Mobile Device (via Kiwi Browser):**
You can use this extension on the go by using an Android browser that supports Chrome extensions, such as Kiwi Browser or Lemur Browser.

1. Install [Kiwi Browser](https://github.com/kiwibrowser/src.next/releases/tag/14310011181) from the official github release.
2. Go to the [Releases page](https://github.com/minkxx/AniKehai/releases) and download `anikehai-2.6.0-chrome.zip` to your phone.
3. Open Kiwi Browser, tap the three dots menu (⋮) in the top right, and select **Extensions**.
4. Enable **Developer mode** using the toggle at the top right.
5. Tap the **+ (from .zip/.crx/.user.js)** button and select the downloaded `.zip` file from your device storage.
6. Open the extension from the bottom of the three dots menu!

---

**Link your Discord:** Open the extension popup from your browser toolbar (or menu) and click **Link with Discord**. You will be redirected to Discord's secure OAuth2 authorization page to authorize the application.

**Start watching:** Open an episode on any supported site, and your Discord rich presence will automatically update!

## v2 - The Native Update

AniKehai has been completely rebuilt from the ground up! **Version 2 is now a standalone browser extension built with [WXT](https://wxt.dev/)**.

* **No More Desktop App:** We have completely removed the Electron desktop middleware.
* **Native WebSockets:** The extension now authenticates via Discord OAuth2 and connects directly to Discord's Gateway via WebSockets natively right from your browser background worker.
* **Better UI:** Features a sleek new React-based popup built with Tailwind CSS and Framer Motion.

## Features

* **Rich Presence:** Displays Anime Title, Episode, and dynamic Watch/Paused states.
* **Live Progress:** Shows real-time progress bars, elapsed time, and time remaining using Discord timestamps.
* **Mobile Support:** Fully functional on Android extension-supported browsers with a custom mobile OAuth authentication flow.
* **Cover Art:** Automatically fetches high-quality cover art. Includes fallback support to the AniList GraphQL API for sites with protected assets (e.g., AnimePahe).
* **Privacy Toggle:** Instantly toggle presence broadcasting on or off from the popup without needing to log out of Discord.
* **Zero Overhead:** Completely contained within your browser with no background desktop apps required.

## Supported Sites

[Supported sites list](https://anikehai.vercel.app/#sites)

## Contributing

Please see our [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for full details on how to set up your environment, write a new site strategy, and submit a Pull Request.

## License

Distributed under the [MIT License](/LICENSE).

<p align="center">Made with ❤️ by Minkxx</p>
