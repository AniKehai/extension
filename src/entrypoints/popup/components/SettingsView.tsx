import { ExternalLink, Link, LogOut, User } from "lucide-react";
import { motion } from "motion/react";
import { DISCORD_SERVER_URL } from "@/shared/constants";
import { useDiscordUser } from "@/shared/ui/hooks/useDiscordUser";
import type { ExtensionStatus } from "@/shared/ui/hooks/useExtensionStatus";

interface SettingsViewProps {
    status: ExtensionStatus;
}

export function SettingsView({ status }: SettingsViewProps) {
    const { avatarUrl, displayName, user } = useDiscordUser();
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    const username = user?.username ?? "";

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-panel-2/60 px-3.5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={`${displayName}'s avatar`}
                            className="h-10 w-10 rounded-full ring-2 ring-white/10 object-cover shrink-0"
                        />
                    ) : (
                        <div
                            role="img"
                            aria-label={`${displayName}'s profile`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-cyan-500/20 to-purple-500/20 ring-2 ring-white/10 text-cyan shrink-0"
                        >
                            {initials ? (
                                <span className="text-base font-semibold">
                                    {initials}
                                </span>
                            ) : (
                                <User size={20} strokeWidth={2} />
                            )}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-ink truncate">
                            {displayName}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                            @{username}
                        </p>
                    </div>
                </div>
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={status.logout}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/20 shrink-0"
                >
                    <LogOut size={12} />
                    Log out
                </motion.button>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wide px-1">
                    Advanced
                </p>
                <div className="flex flex-col gap-2">
                    <div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-medium text-ink">
                                    Clear Status After
                                </p>
                                <p className="text-[11px] text-muted line-clamp-2">
                                    How long before removing your status when
                                    you stop watching
                                </p>
                            </div>
                            <select
                                value={status.resetActivityTimeout}
                                onChange={(e) =>
                                    status.updateResetActivityTimeout(
                                        parseInt(e.target.value, 10),
                                    )
                                }
                                className="w-10 h-6 rounded-lg border border-white/10 bg-panel/50 px-2 text-[12px] font-mono text-ink focus:outline-none focus:ring-1 focus:ring-cyan/50 appearance-none cursor-pointer py-1 leading-normal"
                            >
                                {[1, 2, 3, 4, 5, 10, 15].map((val) => (
                                    <option key={val} value={val}>
                                        {val}s
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-medium text-ink">
                                    Update Status Every
                                </p>
                                <p className="text-[11px] text-muted line-clamp-2">
                                    How often to refresh your episode progress
                                    on Discord
                                </p>
                            </div>
                            <select
                                value={status.checkActivityInterval}
                                onChange={(e) =>
                                    status.updateCheckActivityInterval(
                                        parseInt(e.target.value, 10),
                                    )
                                }
                                className="w-10 h-6 rounded-lg border border-white/10 bg-panel/50 px-2 text-[12px] font-mono text-ink focus:outline-none focus:ring-1 focus:ring-cyan/50 appearance-none cursor-pointer py-1 leading-normal"
                            >
                                {[1, 2, 3, 4, 5, 10, 15].map((val) => (
                                    <option key={val} value={val}>
                                        {val}s
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

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
        </div>
    );
}
