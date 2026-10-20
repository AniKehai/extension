export const currentAnimeState = {
	title: "Unknown",
	episode: "Unknown",
	episodeName: "",
	coverUrl: "",
	currentMs: 0,
	durationMs: 0,
	isPaused: false,
};

let lastBroadcast = {
	title: "",
	episode: "",
	coverUrl: "",
	episodeName: "",
	isPaused: false,
	estimatedStart: 0,
	durationMs: 0,
};

export let activityEnabled = true;
export let privacyEnabled = false;

export function setActivityEnabledFlag(enabled: boolean) {
	activityEnabled = enabled;
}

export function setPrivacyEnabledFlag(enabled: boolean) {
	privacyEnabled = enabled;
}

export function clearAnimeState() {
	currentAnimeState.title = "Unknown";
	currentAnimeState.episode = "Unknown";
	currentAnimeState.episodeName = "";
	currentAnimeState.coverUrl = "";
	currentAnimeState.currentMs = 0;
	currentAnimeState.durationMs = 0;
	currentAnimeState.isPaused = false;

	lastBroadcast = {
		title: "",
		episode: "",
		coverUrl: "",
		episodeName: "",
		isPaused: false,
		estimatedStart: 0,
		durationMs: 0,
	};
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
		timeDrift > 2500 &&
		messageType === "TIME_UPDATE";

	const shouldUpdate =
		hasInfoChanged || hasStateChanged || hasDurationChanged || hasTimeDrifted;

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
