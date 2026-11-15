import { Ghost } from "lucide-react";
import { motion } from "motion/react";

export function IdlePanel() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-panel-2/40 px-6 py-4"
		>
			<div className="w-full h-13 flex items-center justify-center">
				<Ghost size={26} strokeWidth={1.5} className="text-muted" />
			</div>
			<div className="w-full flex flex-col items-center gap-1">
				<p className="text-[13px] font-medium text-ink/80">Nothing's playing</p>
				<p className="max-w-55 text-[11px] leading-snug text-muted text-center">
					Open an episode on a supported site and it'll show up here.
				</p>
			</div>
		</motion.div>
	);
}
