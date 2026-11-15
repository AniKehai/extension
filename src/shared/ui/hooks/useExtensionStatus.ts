import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../../shared/logger";
import type { AnimeState, ViewName } from "../../../shared/types";
import {
	getStatus,
	loginDiscord,
	logoutDiscord,
	setActivityEnabled,
	setPrivacyEnabled,
} from "../lib/runtime-messages";

const POLL_INTERVAL_MS = 3000;

export function useExtensionStatus() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isGatewayReady, setIsGatewayReady] = useState(false);
	const [activityEnabled, setActivityEnabledState] = useState(true);
	const [privacyEnabled, setPrivacyEnabledState] = useState(false);
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
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
			setIsAuthLoading(false);
		}
	}, [refresh]);

	const logout = useCallback(async () => {
		await logoutDiscord();
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

	return {
		isAuthenticated,
		isGatewayReady,
		activityEnabled,
		privacyEnabled,
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
	};
}

export type ExtensionStatus = ReturnType<typeof useExtensionStatus>;
