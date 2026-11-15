import type {
	LoginResponse,
	SimpleResponse,
	StatusResponse,
} from "../../../shared/types";

export function getStatus(): Promise<StatusResponse> {
	return browser.runtime.sendMessage({ type: "GET_STATUS" });
}

export function loginDiscord(): Promise<LoginResponse> {
	return browser.runtime.sendMessage({ type: "LOGIN_DISCORD" });
}

export function logoutDiscord(): Promise<SimpleResponse> {
	return browser.runtime.sendMessage({ type: "LOGOUT_DISCORD" });
}

export function setActivityEnabled(enabled: boolean): Promise<SimpleResponse> {
	return browser.runtime.sendMessage({ type: "SET_ACTIVITY_ENABLED", enabled });
}

export function setPrivacyEnabled(enabled: boolean): Promise<SimpleResponse> {
	return browser.runtime.sendMessage({ type: "SET_PRIVACY_ENABLED", enabled });
}
