import { AnimatePresence, motion } from "motion/react";
import { useExtensionStatus } from "@/shared/ui/hooks/useExtensionStatus";
import { WelcomeContent } from "./components/WelcomeContent";

export default function App() {
	const status = useExtensionStatus();

	if (status.isBootstrapping) {
		return (
			<div className="grid h-full w-full place-items-center bg-void">
				<motion.div
					className="h-8 w-8 rounded-full border-2 border-white/10 border-t-cyan"
					animate={{ rotate: 360 }}
					transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full w-full bg-void text-ink">
			<div className="flex flex-1 overflow-hidden">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key="welcome"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -16 }}
						transition={{ duration: 0.3, ease: "easeOut" }}
						className="flex flex-1 flex-col"
					>
						<WelcomeContent
							onLogin={status.login}
							isLoading={status.isAuthLoading}
							isAuthenticated={status.isAuthenticated}
						/>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className="mt-auto pt-6 pb-4 text-center text-[10.5px] text-muted/70">
				AniKehai · v{browser.runtime.getManifest().version}
			</div>
		</div>
	);
}
