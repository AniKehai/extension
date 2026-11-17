import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AnimeState } from "../../../shared/types";

interface NowPlayingCardProps {
	anime: AnimeState;
}

export function NowPlayingCard({ anime }: NowPlayingCardProps) {
	const [imageFailed, setImageFailed] = useState(false);

	useEffect(() => {
		if (anime.coverUrl !== undefined) {
			setImageFailed(false);
		}
	}, [anime.coverUrl]);

	const episode =
		anime.episode + (anime.episodeName ? `: ${anime.episodeName}` : "");

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={`${anime.title}-${anime.episode}`}
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -8 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-panel-2/40 px-4 py-4"
			>
				<div className="flex w-full gap-4">
					<div className="relative shrink-0 h-28 w-20 overflow-hidden rounded-xl border border-white/10 bg-panel-2">
						{anime.coverUrl && !imageFailed ? (
							<img
								src={anime.coverUrl}
								alt=""
								referrerPolicy="no-referrer"
								onError={() => setImageFailed(true)}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="grid h-full w-full place-items-center px-3 text-center text-[10px] text-muted">
								No cover art yet
							</div>
						)}
					</div>

					<div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 text-left">
						<div className="min-w-0">
							<h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-ink">
								{anime.title}
							</h3>
							<p className="mt-1 line-clamp-2 text-[11px] text-muted">
								{episode}
							</p>
						</div>
						<div className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm self-start">
							{anime.isPaused ? (
								<Pause size={9} strokeWidth={2.5} />
							) : (
								<Play size={9} strokeWidth={2.5} />
							)}
							<span className="text-[9px] font-bold tracking-wide">
								{anime.isPaused ? "PAUSED" : "PLAYING"}
							</span>
						</div>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
