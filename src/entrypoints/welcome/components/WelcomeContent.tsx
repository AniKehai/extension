import {
	Check,
	Globe,
	Monitor,
	Shield,
	Sparkles,
	SquareMousePointer,
} from "lucide-react";
import { motion } from "motion/react";
import { InkDivider } from "@/shared/ui/components/decor/InkDivider";

interface Feature {
	icon: React.ReactNode;
	title: string;
	description: string;
}

const features: Feature[] = [
	{
		icon: <Monitor size={18} strokeWidth={2} className="text-cyan" />,
		title: "Discord Rich Presence",
		description:
			"Automatically shows what you're watching on your Discord profile with episode info and cover art.",
	},
	{
		icon: <Shield size={18} strokeWidth={2} className="text-amber" />,
		title: "Privacy First",
		description:
			"Toggle privacy mode to hide specific titles. Your watch history never leaves your browser.",
	},
	{
		icon: <Globe size={18} strokeWidth={2} className="text-dusk" />,
		title: "Wide Site Support",
		description:
			"Works with 10+ anime streaming sites including AniWave, HiAnime, Miruro, and more.",
	},
];

export function WelcomeContent({
	onLogin,
	isLoading,
	isAuthenticated,
}: {
	onLogin: () => void;
	isLoading: boolean;
	isAuthenticated: boolean;
}) {
	const handleOpenPopup = () => {
		window.open(browser.runtime.getURL("/popup.html"), "_blank");
		window.close();
	};

	return (
		<div className="flex flex-col h-full">
			<div className="flex flex-1 flex-col items-center justify-center px-5 py-6">
				<motion.div
					initial={{ opacity: 0, scale: 0.8, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 280,
						damping: 22,
						delay: 0.1,
					}}
					className="flex flex-col items-center text-center"
				>
					<img
						src="/icon/96.png"
						alt="AniKehai Logo"
						className="h-16 w-16 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]"
					/>
					<h1 className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">
						Welcome to AniKehai
					</h1>
					<p className="mt-2 text-[13px] leading-relaxed text-muted max-w-55">
						Broadcast your anime watching status to Discord with beautiful rich
						presence.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.3 }}
					className="mt-8 w-full"
				>
					<InkDivider className="mb-6 opacity-40" />
					<h2 className="text-[11px] font-semibold tracking-[0.15em] text-muted uppercase mb-4">
						What you can do
					</h2>
					<div className="space-y-3">
						{features.map((feature, index) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
								className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-panel/50"
							>
								<div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
									{feature.icon}
								</div>
								<div className="min-w-0">
									<p className="text-[12.5px] font-medium text-ink">
										{feature.title}
									</p>
									<p className="mt-0.5 text-[11px] leading-snug text-muted">
										{feature.description}
									</p>
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.6 }}
				className="mx-5 mb-5 space-y-3"
			>
				{isAuthenticated ? (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ type: "spring", stiffness: 300, damping: 25 }}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan/10 border border-cyan/30 px-4 py-3 text-cyan"
					>
						<Check size={16} className="shrink-0" />
						<span className="text-[13px] font-semibold">
							Connected to Discord
						</span>
					</motion.div>
				) : (
					<motion.button
						type="button"
						onClick={onLogin}
						disabled={isLoading}
						whileTap={{ scale: 0.97 }}
						whileHover={{ y: -2 }}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:shadow-[0_8px_24px_-8px_rgba(88,101,242,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isLoading ? (
							<>
								<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="3"
										fill="none"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								Connecting…
							</>
						) : (
							<>
								<Sparkles size={16} />
								Link with Discord
							</>
						)}
					</motion.button>
				)}

				<motion.button
					type="button"
					onClick={handleOpenPopup}
					whileTap={{ scale: 0.98 }}
					whileHover={{ y: -2 }}
					className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-panel/60 px-4 py-2.5 text-[13px] font-medium text-muted transition-colors hover:text-ink hover:border-white/20"
				>
					<SquareMousePointer size={14} />
					Open Popup
				</motion.button>

				<p className="text-center text-[10.5px] text-muted/60">
					{isAuthenticated
						? "Manage your settings from the popup."
						: "You can always link Discord later from the popup settings."}
				</p>
			</motion.div>
		</div>
	);
}
