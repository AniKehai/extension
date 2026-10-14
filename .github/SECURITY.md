# Security Policy

## Supported Versions

We currently provide security updates and patches for the following versions of the AniKehai extension:

| Version | Supported          |
| ------- | ------------------ |
| >= 2.0.0   | :white_check_mark: |
| <= 1.4.1 | :x:                |

## Reporting a Vulnerability

We take the security of AniKehai and our users' Discord accounts seriously. 

If you discover a security vulnerability in this project, **please do not report it by creating a public GitHub issue.** Instead, please use GitHub's Private Vulnerability Reporting (PVR) feature. This provides a secure, private channel to reach the maintainers.

1. Go to the **Security** tab of this repository.
2. Click **Advisories** on the left sidebar.
3. Click **Report a vulnerability**.
4. Provide a clear description of the issue, the required steps to reproduce it, and the potential impact.

You can expect an initial acknowledgment of your report within 48 to 72 hours. We will keep you updated as we investigate the issue, develop a mitigation, and coordinate a release timeline.

## Threat Model & Scope

To help security researchers understand our boundaries, below is our expected threat model. 

AniKehai operates as a browser extension that interacts with potentially untrusted third-party streaming sites (`*.anikototv.to`, `*.animepahe.pw`, etc.) while holding a sensitive Discord OAuth2 access token in local storage.

### In-Scope for Bug Bounties / Security Reports
* **Token Theft:** Any vector that allows a malicious host web page or content script to extract the user's `discord_token` or `mobile_oauth_verifier` from `browser.storage.local`.
* **Privilege Escalation:** Exploiting the `browser.runtime.sendMessage` pipeline to execute arbitrary code or unauthorized background script actions from a content script context.
* **Cross-Site Scripting (XSS):** Vulnerabilities arising from improperly sanitized DOM scraping (e.g., parsing the `title` or `episode` fields) that result in script execution within the extension's popup or background contexts.
* **Presence Spoofing:** Arbitrary web pages successfully injecting fake RPC statuses by bypassing the domain matching strategies.

### Out-of-Scope
The following scenarios are considered out of scope and do not pose a vulnerability to the extension itself:
* **Public Client IDs:** The Discord Application ID (`1526911509878538340`) and the Chrome Web Store extension keys are inherently public and cannot be used maliciously without a user's explicit OAuth consent.
* **Self-Exploitation:** Attacks that require the user to open Developer Tools and manually modify their own local extension files or local storage state.
* **Third-Party Site Compromise:** Security flaws, malware, or vulnerabilities present on the streaming websites themselves (e.g., a malicious iframe source).
* **Rate Limiting / DoS:** Getting the extension rate-limited by the Discord Gateway or the AniList GraphQL API.

## Dependency Security
We utilize automated scanning via Dependabot to monitor for known vulnerabilities in our upstream packages (e.g., `wxt`, `react`, `lucide-react`). Critical dependency updates are triaged and released immediately.
