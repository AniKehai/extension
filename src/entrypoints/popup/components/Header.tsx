import { Settings } from "lucide-react";
import { motion } from "motion/react";
import type { ViewName } from "../../../shared/types";
import { type ConnectionState, StatusBadge } from "./StatusBadge";

interface HeaderProps {
	state: ConnectionState;
	view: ViewName;
	onToggleSettings: () => void;
}

export function Header({ state, view, onToggleSettings }: HeaderProps) {
	return (
		<header className="flex items-center justify-between px-5 pt-5">
			<div className="flex items-baseline gap-2">
				<span className="text-[15px] font-extrabold tracking-tight text-ink">
					AniKehai
				</span>
			</div>

			<div className="flex items-center gap-2">
				{state === "connecting" && <StatusBadge state={state} />}
				<motion.button
					type="button"
					aria-label={
						view === "settings" ? "Back to now playing" : "Open settings"
					}
					onClick={onToggleSettings}
					whileTap={{ scale: 0.9, rotate: 45 }}
					className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-panel-2/70 text-muted transition-colors hover:text-ink"
				>
					<Settings
						size={14}
						strokeWidth={2}
						className={view === "settings" ? "text-cyan" : undefined}
					/>
				</motion.button>
			</div>
		</header>
	);
}
