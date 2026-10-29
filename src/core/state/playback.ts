import type { AnimeState } from "../../shared/types";

function defaultState(): AnimeState {
	return {
		title: null as unknown as string,
		episode: null as unknown as string,
		episodeName: undefined,
		coverUrl: "",
		currentMs: 0,
		durationMs: 0,
		isPaused: false,
	};
}

export const currentAnimeState = defaultState();

let lastBroadcast = {
	title: null as string | null,
	episode: null as string | null,
	coverUrl: "",
	episodeName: undefined as string | undefined,
	isPaused: false,
	estimatedStart: 0,
	durationMs: 0,
};

let lastValidMetadataTime = 0;
const METADATA_TTL = 30_000; // 30 seconds

export let activityEnabled = true;
export let privacyEnabled = false;

export function setActivityEnabledFlag(enabled: boolean) {
	activityEnabled = enabled;
}

export function setPrivacyEnabledFlag(enabled: boolean) {
	privacyEnabled = enabled;
}

export function clearAnimeState() {
	Object.assign(currentAnimeState, defaultState());

	lastBroadcast = {
		title: null,
		episode: null,
		coverUrl: "",
		episodeName: undefined,
		isPaused: false,
		estimatedStart: 0,
		durationMs: 0,
	};
	lastValidMetadataTime = 0;
}

export function evaluateDiscordUpdate(
	messageType: "INFO_UPDATE" | "TIME_UPDATE",
) {
	const newEstimatedStart =
		messageType === "TIME_UPDATE"
			? Date.now() - currentAnimeState.currentMs
			: lastBroadcast.estimatedStart;

	const timeDrift = Math.abs(newEstimatedStart - lastBroadcast.estimatedStart);

	const hasInfoChanged =
		currentAnimeState.title !== lastBroadcast.title ||
		currentAnimeState.episode !== lastBroadcast.episode ||
		currentAnimeState.coverUrl !== lastBroadcast.coverUrl;

	const hasStateChanged = currentAnimeState.isPaused !== lastBroadcast.isPaused;

	const hasDurationChanged =
		Math.abs(currentAnimeState.durationMs - lastBroadcast.durationMs) > 1000;

	const hasTimeDrifted =
		!currentAnimeState.isPaused &&
		currentAnimeState.durationMs > 0 &&
		timeDrift > 2500 &&
		messageType === "TIME_UPDATE";

	const isCurrentEmpty = currentAnimeState.title === null;
	const isPrevEmpty =
		lastBroadcast.title === null || lastBroadcast.title === "";

	if (isCurrentEmpty && !isPrevEmpty) {
		const timeSinceValidMetadata = Date.now() - lastValidMetadataTime;
		if (timeSinceValidMetadata < METADATA_TTL) {
			return { shouldUpdate: false, newEstimatedStart };
		}
	}

	if (isCurrentEmpty && isPrevEmpty) {
		return { shouldUpdate: false, newEstimatedStart };
	}

	const shouldUpdate =
		hasInfoChanged || hasStateChanged || hasDurationChanged || hasTimeDrifted;

	if (!isCurrentEmpty && (messageType === "INFO_UPDATE" || shouldUpdate)) {
		lastValidMetadataTime = Date.now();
	}

	return { shouldUpdate, newEstimatedStart };
}

export function commitBroadcast(estimatedStart: number) {
	lastBroadcast = {
		title: currentAnimeState.title,
		episode: currentAnimeState.episode,
		coverUrl: currentAnimeState.coverUrl,
		episodeName: currentAnimeState.episodeName,
		isPaused: currentAnimeState.isPaused,
		estimatedStart,
		durationMs: currentAnimeState.durationMs,
	};
}
