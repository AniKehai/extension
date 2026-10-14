import { AnimatePresence, motion } from "motion/react";
import { EXTENSION_VERSION } from "../../../shared/constants";
import type { ExtensionStatus } from "../hooks/useExtensionStatus";
import { InkDivider } from "./decor/InkDivider";
import { Header } from "./Header";
import { IdlePanel } from "./IdlePanel";
import { NowPlayingCard } from "./NowPlayingCard";
import { SettingsView } from "./SettingsView";

interface AppShellProps {
	status: ExtensionStatus;
}

export function AppShell({ status }: AppShellProps) {
	const connectionState = !status.isAuthenticated
		? "offline"
		: status.isGatewayReady
			? "live"
			: "connecting";

	return (
		<div className="flex min-h-115 flex-col pb-4">
			<Header
				state={connectionState}
				view={status.view}
				onToggleSettings={() =>
					status.setView(status.view === "settings" ? "home" : "settings")
				}
			/>

			<div className="mt-4 px-5">
				<InkDivider />
			</div>

			<div className="relative mt-4 flex flex-col overflow-hidden px-5">
				<AnimatePresence mode="wait" initial={false}>
					{status.view === "home" ? (
						<motion.div
							key="home"
							initial={{ opacity: 0, x: -16 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -16 }}
							transition={{ duration: 0.22, ease: "easeOut" }}
							className="flex flex-1 flex-col justify-center pt-2"
						>
							{status.currentAnime ? (
								<NowPlayingCard anime={status.currentAnime} />
							) : (
								<IdlePanel />
							)}
						</motion.div>
					) : (
						<motion.div
							key="settings"
							initial={{ opacity: 0, x: 16 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 16 }}
							transition={{ duration: 0.22, ease: "easeOut" }}
						>
							<SettingsView status={status} />
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<div className="mt-auto pt-6 text-center text-[10.5px] text-muted/70">
				AniKehai · v{EXTENSION_VERSION}
			</div>
		</div>
	);
}
