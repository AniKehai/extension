import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { extractMatches } from "./src/scraper/extractor";
import { strategies } from "./src/scraper/sites";

export default defineConfig({
	srcDir: "src",
	manifest: ({ browser }) => ({
		name: "AniKehai",
		...(browser === "chrome"
			? {
					key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu+VrTvAa1lImCgCA/7mHz/Uvrp5WojKj907yEZbFVzHI8opZitOZe2UsO0kJJg2vpz6SiGJqcswWheooujJiVWI8h2QVCwHnXXHRnrKfxTv9sLmTH8w3wyRwgibUPE+Yyc2GChRUjWJqH30FxrSxH47tbvnghJEZaqcmyAerPMwOSzOyGs6Qj5AZzHtMsCH6UHCf0wM+e1kLuqvXgm93Qsg7jOGlaK3zq84vqt2E1dzxwnv1DFyGVnA3YZYD3b8ShuGIeKHF+f3VmNGYoBaXEg5XWcFfIMcw64Igu2m0LMGBm7ix6bRLfZsQk1mPaZYA+XVb+Td3+4KOana94P1vtQIDAQAB",
				}
			: {}),
		permissions: [
			"storage",
			"tabs",
			...(browser === "chrome" ? ["identity"] : []),
		],
		host_permissions: [
			...extractMatches(strategies),
			"https://discord.com/*",
			"wss://gateway.discord.gg/*",
		],
		browser_specific_settings: {
			gecko: {
				id: "anime-rpc@minkxx.dev",
				strict_min_version: "142.0",
				data_collection_permissions: {
					required: ["none"],
				},
			},
		},
	}),
	vite: () => ({
		plugins: [tailwindcss()],
		server: {
			fs: {
				allow: ["../.."],
			},
		},
	}),
	modules: ["@wxt-dev/module-react"],
});
