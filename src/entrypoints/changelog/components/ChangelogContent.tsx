import { ExternalLink, SquareMousePointer, X } from "lucide-react";
import { motion } from "motion/react";
import { InkDivider } from "@/shared/ui/components/decor/InkDivider";

interface ChangelogEntry {
	version: string;
	date: string;
	isLatest: boolean;
	sections: {
		added: string[];
		changed: string[];
		fixed: string[];
		removed: string[];
	};
}

const changelogData: ChangelogEntry[] = [
	{
		version: "3.0.0",
		date: "2024-01-15",
		isLatest: true,
		sections: {
			added: [
				"Welcome page for first-time install with onboarding flow",
				"Changelog page for updates with version history",
				"Shared UI component library for consistent theming across pages",
				"Support for 3 new anime sites: AniWave, Miruro v2, AnimeX",
			],
			changed: [
				"Refactored popup to use shared components",
				"Improved Discord Rich Presence with better cover art fetching",
				"Updated Tailwind CSS to v4 with new theme system",
			],
			fixed: [
				"Fixed memory leak in background script content script reinjection",
				"Fixed privacy mode not persisting across browser restarts",
				"Fixed episode name not displaying for some sites",
			],
			removed: ["Removed legacy scraper for deprecated sites"],
		},
	},
	{
		version: "2.5.0",
		date: "2023-11-20",
		isLatest: false,
		sections: {
			added: [
				"Privacy mode toggle to hide anime titles from Discord",
				"Support for HiAnime and AniWatch sites",
				"Episode progress tracking with pause/resume detection",
			],
			changed: [
				"Improved AniList cover art matching accuracy",
				"Reduced background script memory usage by 40%",
			],
			fixed: [
				"Fixed Discord reconnection after network interruption",
				"Fixed content script injection on dynamic site navigation",
			],
			removed: [],
		},
	},
	{
		version: "2.0.0",
		date: "2023-09-01",
		isLatest: false,
		sections: {
			added: [
				"Complete rewrite with WXT + React + TypeScript",
				"Discord Rich Presence with cover art and episode info",
				"Settings panel with activity/privacy toggles",
				"Support for 8 anime streaming sites",
			],
			changed: [],
			fixed: [],
			removed: ["Removed legacy manifest v2 support"],
		},
	},
];

interface SectionConfig {
	key: keyof ChangelogEntry["sections"];
	label: string;
	icon: React.ReactNode;
	color: string;
}

const sections: SectionConfig[] = [
	{
		key: "added",
		label: "Added",
		icon: <span className="h-1.5 w-1.5 rounded-full bg-cyan" />,
		color: "text-cyan",
	},
	{
		key: "changed",
		label: "Changed",
		icon: <span className="h-1.5 w-1.5 rounded-full bg-amber" />,
		color: "text-amber",
	},
	{
		key: "fixed",
		label: "Fixed",
		icon: <span className="h-1.5 w-1.5 rounded-full bg-dusk" />,
		color: "text-dusk",
	},
	{
		key: "removed",
		label: "Removed",
		icon: <span className="h-1.5 w-1.5 rounded-full bg-muted" />,
		color: "text-muted",
	},
];

export function ChangelogContent({ onDismiss }: { onDismiss: () => void }) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex flex-1 flex-col overflow-hidden">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="px-5 py-6 shrink-0"
				>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-[20px] font-extrabold tracking-tight text-ink">
								What's New
							</h1>
							<p className="mt-1 text-[12px] text-muted">
								AniKehai v{browser.runtime.getManifest().version}
							</p>
						</div>
						<div className="flex items-center gap-1">
							<motion.button
								type="button"
								onClick={() => {
									window.open(browser.runtime.getURL("/popup.html"), "_blank");
									onDismiss();
								}}
								whileTap={{ scale: 0.9 }}
								whileHover={{ scale: 1.05 }}
								className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-ink hover:bg-white/5 transition-colors"
								aria-label="Open Popup"
							>
								<SquareMousePointer size={12} />
								Open Popup
							</motion.button>
							<motion.button
								type="button"
								onClick={onDismiss}
								whileTap={{ scale: 0.9 }}
								className="p-1 rounded-lg text-muted hover:text-ink hover:bg-white/5 transition-colors"
								aria-label="Dismiss"
							>
								<X size={16} strokeWidth={2} />
							</motion.button>
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="flex flex-1 overflow-y-auto px-5 pb-6 pr-2"
				>
					<div className="space-y-6">
						{changelogData.map((entry, entryIndex) => (
							<motion.div
								key={entry.version}
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: 0.15 + entryIndex * 0.08 }}
								className="space-y-4"
							>
								<div className="flex items-center gap-2">
									<span
										className={`font-bold text-[13px] ${entry.isLatest ? "text-cyan" : "text-ink"}`}
									>
										v{entry.version}
									</span>
									{entry.isLatest && (
										<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan/20 text-cyan">
											NEW
										</span>
									)}
									<span className="text-[11px] text-muted/70 ml-auto">
										{entry.date}
									</span>
								</div>

								{entry.isLatest && <InkDivider className="opacity-60" />}

								<div className="space-y-3">
									{sections.map((section) => {
										const items = entry.sections[section.key];
										if (!items.length) return null;

										return (
											<motion.div
												key={section.key}
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												transition={{ duration: 0.2 }}
												className="space-y-2"
											>
												<div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest {section.color}">
													{section.icon}
													{section.label}
												</div>
												<ul className="ml-5 space-y-1.5 border-l border-white/5 pl-3">
													{items.map((item, itemIndex) => (
														<motion.li
															key={item}
															initial={{ opacity: 0, x: -10 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{
																duration: 0.2,
																delay:
																	0.2 + entryIndex * 0.08 + itemIndex * 0.03,
															}}
															className="relative text-[12px] leading-snug text-ink/90 before:absolute before:left-2.25 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/20"
														>
															{item}
														</motion.li>
													))}
												</ul>
											</motion.div>
										);
									})}
								</div>

								{!entry.isLatest && <InkDivider className="opacity-30" />}
							</motion.div>
						))}
					</div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3, delay: 0.5 }}
						className="mt-6 pt-4 text-center"
					>
						<a
							href="https://github.com/minkxx/anikehai/releases"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-cyan transition-colors"
						>
							View full changelog on GitHub
							<ExternalLink size={12} />
						</a>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}
