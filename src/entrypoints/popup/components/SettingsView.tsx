import { ArrowLeft, ExternalLink, Link, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { DISCORD_SERVER_URL } from "@/shared/constants";
import { InkDivider } from "@/shared/ui/components/decor/InkDivider";
import type { ExtensionStatus } from "@/shared/ui/hooks/useExtensionStatus";
import { ToggleSwitch } from "./ToggleSwitch";

interface SettingsViewProps {
	status: ExtensionStatus;
}

export function SettingsView({ status }: SettingsViewProps) {
	return (
		<div className="flex flex-col gap-3">
			<button
				type="button"
				onClick={() => status.setView("home")}
				className="flex w-fit items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
			>
				<ArrowLeft size={14} />
				Back
			</button>

			<div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3.5">
				<ToggleSwitch
					checked={status.privacyEnabled}
					onChange={status.togglePrivacy}
					label="Privacy"
					description="Turn on to hide which anime you're watching."
				/>
			</div>

			<div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3.5">
				<ToggleSwitch
					checked={status.activityEnabled}
					onChange={status.toggleActivity}
					label="Broadcast to Discord"
					description="Turn off to hide your watching status without logging out."
				/>
			</div>

			<InkDivider className="my-1 opacity-60" />

			<a
				href={DISCORD_SERVER_URL}
				target="_blank"
				rel="noreferrer"
				className="flex items-center justify-between rounded-2xl border border-white/10 bg-panel-2/60 px-3.5 py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-dusk/40"
			>
				<span className="flex items-center gap-2">
					<Link size={15} className="text-dusk" />
					Join Our Discord Server
				</span>
				<ExternalLink size={13} className="text-muted" />
			</a>

			<motion.button
				type="button"
				whileTap={{ scale: 0.98 }}
				onClick={status.logout}
				className="flex items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20"
			>
				<LogOut size={14} />
				Log out of Discord
			</motion.button>
		</div>
	);
}
