import { Settings, User } from "lucide-react";
import { motion } from "motion/react";
import type { ViewName } from "../../../shared/types";
import { useDiscordUser } from "../hooks/useDiscordUser";
import { type ConnectionState, StatusBadge } from "./StatusBadge";

interface HeaderProps {
    state: ConnectionState;
    view: ViewName;
    onToggleSettings: () => void;
    showSettings?: boolean;
}

export function Header({
    state,
    view,
    onToggleSettings,
    showSettings = true,
}: HeaderProps) {
    const { avatarUrl, displayName } = useDiscordUser();
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <header className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tracking-tight text-ink">
                    AniKehai
                </span>
            </div>

            <div className="flex items-center gap-3">
                {state === "connecting" && <StatusBadge />}
                {showSettings && (
                    <motion.button
                        type="button"
                        aria-label={
                            view === "settings"
                                ? "Back to now playing"
                                : "Open settings"
                        }
                        onClick={onToggleSettings}
                        whileTap={{ scale: 0.9, rotate: 45 }}
                        className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-panel-2/70 text-muted transition-colors hover:text-ink"
                    >
                        <Settings
                            size={16}
                            strokeWidth={2}
                            className={
                                view === "settings" ? "text-cyan" : undefined
                            }
                        />
                    </motion.button>
                )}
                <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -180 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={`${displayName}'s avatar`}
                            className="rounded-full h-9 w-9 ring-2 ring-white/10 object-cover"
                        />
                    ) : (
                        <div
                            role="img"
                            aria-label={`${displayName}'s profile`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-cyan-500/20 to-purple-500/20 ring-2 ring-white/10 text-cyan"
                        >
                            {initials ? (
                                <span className="text-sm font-semibold">
                                    {initials}
                                </span>
                            ) : (
                                <User size={18} strokeWidth={2} />
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </header>
    );
}
