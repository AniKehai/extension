export interface StoppedState {
	type: "STOPPED";
}

export interface ActiveState {
	type: "WATCHING" | "PAUSED";
	title: string;
	episode: string;
	episodeName?: string;
	coverUrl: string;
	currentMs: number;
	durationMs: number;
}

export type PlaybackState = StoppedState | ActiveState;

export type RuntimeMessage =
	| { type: "GET_STATUS" }
	| { type: "LOGIN_DISCORD" }
	| { type: "LOGOUT_DISCORD" }
	| { type: "SET_ACTIVITY_ENABLED"; enabled: boolean }
	| { type: "SET_PRIVACY_ENABLED"; enabled: boolean }
	| { type: "STOPPED" }
	| { type: "FETCH_ANILIST"; anilistId: number }
	| { type: "FETCH_ANILIST_BY_TITLE"; title: string }
	| {
			type: "INFO_UPDATE";
			title: string;
			episode: string;
			episodeName?: string | null;
			coverUrl: string | null;
	  }
	| {
			type: "TIME_UPDATE";
			currentMs: number;
			durationMs: number;
			isPaused: boolean;
	  };

export interface AnimeMetadata {
	title: string | null | undefined;
	episode: string | null | undefined;
	episodeName?: string | null | undefined;
	coverUrl: string | null | undefined;
}

export interface ProgressStats {
	currentMs: number | null | undefined;
	durationMs: number | null | undefined;
	isPaused: boolean | null | undefined;
}

export interface AnimeSite {
	domains: string[];
	iframe_src: string[];
	getAnimeMetadata: () => AnimeMetadata;
	getProgressStats: () => ProgressStats;
}

export interface AnimeState {
	title: string;
	episode: string;
	episodeName?: string;
	coverUrl: string;
	isPaused: boolean;
	currentMs: number;
	durationMs: number;
}

export type ViewName = "home" | "settings";

export interface StatusResponse {
	hasToken: boolean;
	isGatewayReady: boolean;
	activityEnabled?: boolean;
	privacyEnabled?: boolean;
	authError?: string | null;
	currentAnime: AnimeState | null;
}

export interface LoginResponse {
	status: "token" | "pending" | "failed";
	error?: string;
}

export interface SimpleResponse {
	success: boolean;
}
