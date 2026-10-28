import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, popupUrl, test } from "./fixtures";

// Map each supported site to its expected behavior and fixture requirements
const SITES = [
	{
		id: "anikoto",
		url: "https://anikototv.to/watch/1",
		pageTitle: "Watch Frieren",
		expectedTitle: "Frieren: Beyond Journey's End",
		expectedEpisode: "Episode 3: Killing Magic",
	},
	{
		id: "animepahe",
		url: "https://animepahe.pw/play/1",
		pageTitle: "Watch AnimePahe",
		expectedTitle: "Sousou no Frieren",
		expectedEpisode: "Episode 12",
	},
	{
		id: "aniwatch",
		url: "https://aniwatch.cx/watch/1",
		pageTitle: "Watch Aniwatch",
		expectedTitle: "Dandadan",
		expectedEpisode: "Episode 7: Evil Eye",
	},
	{
		id: "aniwave",
		url: "https://aniwaves.ru/watch/1",
		pageTitle: "Watch Aniwave",
		expectedTitle: "Solo Leveling",
		expectedEpisode: "Episode 5: Arise",
	},
	{
		id: "hianime",
		url: "https://hianime.at/watch/bocchi-the-rock-1",
		pageTitle: "Watch Bocchi",
		expectedTitle: "Bocchi the Rock!",
		expectedEpisode: "Episode 4: Four Eyes",
	},
	{
		id: "kaa",
		url: "https://kaa.lt/magical-explorer/ep-3-fc60be",
		// KAA strategy strictly requires this title format to trigger parsing
		pageTitle: "KickAssAnime - Magical Explorer - Episode 03 - English Dub",
		expectedTitle: "Magical Explorer",
		expectedEpisode: "Episode 3",
	},
	{
		id: "miruro",
		url: "https://www.miruro.cx/watch/oshi-no-ko?ep=3",
		pageTitle: "Watch Miruro",
		expectedTitle: "Oshi no Ko",
		expectedEpisode: "Episode 3: Idol",
	},
	{
		id: "reanime",
		url: "https://reanime.to/watch/overgeared-vc4j78?ep=2",
		// ReAnime strategy strictly requires this title format to trigger parsing
		pageTitle: "Overgeared - Episode 2 | Re:ANIME",
		headInject:
			'<meta property="og:image" content="https://s4.anilist.co/o.jpg">',
		expectedTitle: "Overgeared",
		expectedEpisode: "Episode 2: Grid's Trial",
	},
];

test.describe("Content script metadata extraction & broadcast", () => {
	for (const site of SITES) {
		test(`feeds the popup's now-playing card for ${site.id}`, async ({
			context,
			extensionId,
			storage,
		}) => {
			const fixturePath = path.resolve(
				process.cwd(),
				`tests/fixtures/${site.id}/watch.html.fixture`,
			);
			const fixtureData = readFileSync(fixturePath, "utf8");

			const htmlPayload = `
				<!doctype html>
				<html>
					<head>
						<title>${site.pageTitle}</title>
						${site.headInject || ""}
					</head>
					<body>${fixtureData}</body>
				</html>
			`;

			const domain = new URL(site.url).origin;
			await context.route(`${domain}/**`, (route) =>
				route.fulfill({ contentType: "text/html", body: htmlPayload }),
			);

			const popup = await context.newPage();
			await popup.goto(popupUrl(extensionId));

			await storage.set(popup, { discord_token: "e2e-fake-token" });

			const watch = await context.newPage();
			await watch.goto(site.url);
			await watch.bringToFront();

			// Content script polls every 5s. Give it one full tick plus a safety margin.
			await watch.waitForTimeout(6_500);

			await popup.bringToFront();

			await expect
				.poll(
					async () =>
						popup
							.getByRole("heading", { name: site.expectedTitle })
							.isVisible(),
					{ timeout: 12_000 },
				)
				.toBeTruthy();

			await expect(popup.getByText(site.expectedEpisode)).toBeVisible();
		});
	}
});
