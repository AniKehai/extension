import { AnimatePresence, motion } from "motion/react";
import { InkDivider } from "@/shared/ui/components/decor/InkDivider";
import { Header } from "@/shared/ui/components/Header";
import type { ExtensionStatus } from "@/shared/ui/hooks/useExtensionStatus";
import { IdlePanel } from "./IdlePanel";
import { NowPlayingCard } from "./NowPlayingCard";
import { SettingsView } from "./SettingsView";
import { ToggleSwitch } from "./ToggleSwitch";

interface AppShellProps {
    status: ExtensionStatus;
}

export function AppShell({ status }: AppShellProps) {
    const connectionState = !status.isAuthenticated
        ? "offline"
        : status.isGatewayReady
          ? "live"
          : "connecting";

    return (
        <div className="flex min-h-115 flex-col pb-4">
            <Header
                state={connectionState}
                view={status.view}
                onToggleSettings={() =>
                    status.setView(
                        status.view === "settings" ? "home" : "settings",
                    )
                }
            />

            <div className="mt-2 px-5">
                <InkDivider />
            </div>

            <div className="relative mt-4 flex flex-col overflow-hidden px-5">
                <AnimatePresence mode="wait" initial={false}>
                    {status.view === "home" ? (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="flex flex-1 flex-col justify-center pt-2"
                        >
                            {status.currentAnime ? (
                                <NowPlayingCard anime={status.currentAnime} />
                            ) : (
                                <IdlePanel />
                            )}
                            <div className="mt-4 flex flex-col gap-3">
                                <div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3.5">
                                    <ToggleSwitch
                                        checked={status.privacyEnabled}
                                        onChange={status.togglePrivacy}
                                        label="Go Incognito"
                                        description="Barrier of Darkness: Deploy"
                                    />
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-panel-2/60 px-3.5">
                                    <ToggleSwitch
                                        checked={!status.activityEnabled}
                                        onChange={(enabled) =>
                                            status.toggleActivity(!enabled)
                                        }
                                        label="Hide Activity"
                                        description="Severing my presence..."
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                            <SettingsView status={status} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-auto pt-6 text-center text-[10.5px] text-muted/70">
                AniKehai · v{browser.runtime.getManifest().version}
            </div>
        </div>
    );
}
