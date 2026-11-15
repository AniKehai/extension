import { AnimatePresence, motion } from "motion/react";
import { useExtensionStatus } from "@/shared/ui/hooks/useExtensionStatus";
import { AppShell } from "./components/AppShell";
import { AuthGateModal } from "./components/AuthGateModal";

export default function App() {
	const status = useExtensionStatus();

	if (status.isBootstrapping) {
		return (
			<div className="grid h-55 w-95 place-items-center bg-void">
				<motion.div
					className="h-8 w-8 rounded-full border-2 border-white/10 border-t-cyan"
					animate={{ rotate: 360 }}
					transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
				/>
			</div>
		);
	}

	return (
		<div
			className={`relative w-95 overflow-hidden bg-void text-ink ${
				status.isAuthenticated ? "" : "min-h-115"
			}`}
		>
			<div
				aria-hidden={!status.isAuthenticated}
				inert={!status.isAuthenticated ? true : undefined}
				className={
					status.isAuthenticated
						? "relative"
						: "relative pointer-events-none select-none opacity-40 blur-[2px]"
				}
			>
				<AppShell status={status} />
			</div>

			<AnimatePresence>
				{!status.isAuthenticated && (
					<AuthGateModal
						onLogin={status.login}
						isLoading={status.isAuthLoading}
						error={status.error}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
