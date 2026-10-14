import { motion } from "motion/react";
import { InkDivider } from "./decor/InkDivider";

interface AuthGateModalProps {
	onLogin: () => void;
	isLoading: boolean;
	error: string | null;
}

export function AuthGateModal({
	onLogin,
	isLoading,
	error,
}: AuthGateModalProps) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="absolute inset-0 z-10 flex items-center justify-center bg-void/80 px-5 backdrop-blur-sm"
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.92, y: 10 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.94, y: 6 }}
				transition={{ type: "spring", stiffness: 340, damping: 26 }}
				className="w-full rounded-2xl border border-white/10 bg-panel p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
			>
				<img
					src="/icon/96.png"
					alt="AniKehai Logo"
					className="mx-auto h-12 w-12 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]"
				/>

				<h2 className="mt-4 text-center text-[15px] font-bold text-ink">
					AniKehai
				</h2>
				<p className="mt-1.5 text-center text-[12px] leading-relaxed text-muted">
					Link your Discord account so AniKehai can broadcast what you're
					watching.
				</p>

				{error && (
					<p className="mt-3 rounded-lg border border-cyan/30 bg-cyan/10 px-2.5 py-2 text-[11px] text-cyan">
						{error}
					</p>
				)}

				<motion.button
					type="button"
					onClick={onLogin}
					disabled={isLoading}
					whileTap={{ scale: 0.97 }}
					className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
				>
					{isLoading ? "Connecting…" : "Link with Discord"}
				</motion.button>

				<InkDivider className="mt-4 opacity-40" />
				<p className="mt-3 text-center text-[10.5px] text-muted/70">
					Only your presence data is shared — never your watch history.
				</p>
			</motion.div>
		</motion.div>
	);
}
