import { describe, expect, it } from "vitest";
import {
	APPLICATION_ID,
	CHECK_ACTIVITY_INTERVAL,
	DISCORD_SERVER_URL,
	RESET_ACTIVITY_TIMEOUT,
} from "../../src/shared/constants";

describe("constants", () => {
	it("APPLICATION_ID is a Discord snowflake", () => {
		expect(APPLICATION_ID).toMatch(/^\d{17,20}$/);
	});

	it("DISCORD_SERVER_URL is an https discord invite", () => {
		expect(DISCORD_SERVER_URL).toMatch(/^https:\/\/discord\.gg\/\w+$/);
	});

	it("the idle timeout outlasts the polling interval (else presence flickers off)", () => {
		expect(RESET_ACTIVITY_TIMEOUT).toBeGreaterThan(CHECK_ACTIVITY_INTERVAL);
	});
});
