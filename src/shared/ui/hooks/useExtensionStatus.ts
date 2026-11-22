import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDiscordUser } from "@/core/discord/auth";
import { setSentryUser } from "@/utils/sentry";
import { logger } from "../../../shared/logger";
import type { AnimeState, ViewName } from "../../../shared/types";
import {
	getStatus,
	loginDiscord,
	logoutDiscord,
	setActivityEnabled,
	setCheckActivityInterval,
	setPrivacyEnabled,
	setResetActivityTimeout,
} from "../lib/runtime-messages";

const POLL_INTERVAL_MS = 3000;

export function useExtensionStatus() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isGatewayReady, setIsGatewayReady] = useState(false);
	const [activityEnabled, setActivityEnabledState] = useState(true);
	const [privacyEnabled, setPrivacyEnabledState] = useState(false);
	const [resetActivityTimeout, setResetActivityTimeoutState] = useState(10);
	const [checkActivityInterval, setCheckActivityIntervalState] = useState(5);
	const [currentAnime, setCurrentAnime] = useState<AnimeState | null>(null);
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const [isAuthLoading, setIsAuthLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [view, setView] = useState<ViewName>("home");
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await getStatus();
			setIsAuthenticated(res.hasToken);
			setIsGatewayReady(res.isGatewayReady);
			setActivityEnabledState(res.activityEnabled ?? true);
			setPrivacyEnabledState(res.privacyEnabled ?? false);
			setResetActivityTimeoutState(res.resetActivityTimeout ?? 10);
			setCheckActivityIntervalState(res.checkActivityInterval ?? 5);

			if (res.authError) {
				setError(res.authError);
				setIsAuthLoading(false);
				await browser.storage.local.remove("auth_error");
			} else if (res.hasToken) {
				setIsAuthLoading(false);
				setError(null);
			}

			const anime = res.currentAnime;
			if (anime?.title) {
				setCurrentAnime({
					title: anime.title,
					episode: anime.episode,
					episodeName: anime.episodeName,
					coverUrl: anime.coverUrl,
					isPaused: !!anime.isPaused,
					currentMs: anime.currentMs,
					durationMs: anime.durationMs,
				});
			} else {
				setCurrentAnime(null);
			}
		} catch (err) {
			logger.error("[popup] failed to read status", err);
		} finally {
			setIsBootstrapping(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [refresh]);

	const login = useCallback(async () => {
		setIsAuthLoading(true);
		setError(null);
		try {
			const res = await loginDiscord();
			if (res?.status === "failed") {
				setError(res?.error ?? "Login was cancelled or failed.");
				setIsAuthLoading(false);
			}
			await refresh();
			const user = await fetchDiscordUser();
			if (user) {
				setSentryUser({ id: user.id, username: user.username });
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
			setIsAuthLoading(false);
		}
	}, [refresh]);

	const logout = useCallback(async () => {
		await logoutDiscord();
		setSentryUser(null);
		setIsAuthenticated(false);
		setIsGatewayReady(false);
		setCurrentAnime(null);
		setView("home");
	}, []);

	const toggleActivity = useCallback(
		async (next: boolean) => {
			const previous = activityEnabled;
			setActivityEnabledState(next);
			try {
				await setActivityEnabled(next);
			} catch (err) {
				logger.error("[popup] failed to update activity flag", err);
				setActivityEnabledState(previous);
			}
		},
		[activityEnabled],
	);

	const togglePrivacy = useCallback(
		async (next: boolean) => {
			const previous = privacyEnabled;
			setPrivacyEnabledState(next);
			try {
				await setPrivacyEnabled(next);
			} catch (err) {
				logger.error("[popup] failed to update privacy flag", err);
				setPrivacyEnabledState(previous);
			}
		},
		[privacyEnabled],
	);

	const updateResetActivityTimeout = useCallback(
		async (next: number) => {
			const previous = resetActivityTimeout;
			setResetActivityTimeoutState(next);
			try {
				await setResetActivityTimeout(next);
			} catch (err) {
				logger.error("[popup] failed to update reset activity timeout", err);
				setResetActivityTimeoutState(previous);
			}
		},
		[resetActivityTimeout],
	);

	const updateCheckActivityInterval = useCallback(
		async (next: number) => {
			const previous = checkActivityInterval;
			setCheckActivityIntervalState(next);
			try {
				await setCheckActivityInterval(next);
			} catch (err) {
				logger.error("[popup] failed to update check activity interval", err);
				setCheckActivityIntervalState(previous);
			}
		},
		[checkActivityInterval],
	);

	return {
		isAuthenticated,
		isGatewayReady,
		activityEnabled,
		privacyEnabled,
		resetActivityTimeout,
		checkActivityInterval,
		currentAnime,
		isBootstrapping,
		isAuthLoading,
		error,
		view,
		setView,
		login,
		logout,
		toggleActivity,
		togglePrivacy,
		updateResetActivityTimeout,
		updateCheckActivityInterval,
	};
}

export type ExtensionStatus = ReturnType<typeof useExtensionStatus>;
