export type ConnectionState = "live" | "connecting" | "offline";

export function StatusBadge() {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-panel-2/70 px-2.5 py-1 text-[11px] font-medium text-muted">
			<span className="relative flex h-1.5 w-1.5">
				<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
			</span>
			Connecting
		</span>
	);
}
