import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadLogger(initialEnabled?: boolean) {
	if (initialEnabled !== undefined) {
		await browser.storage.local.set({ enable_logs: initialEnabled });
	}
	vi.resetModules();
	const mod = await import("../../src/shared/logger");

	await new Promise((r) => setTimeout(r, 0));
	return mod.logger;
}

let log: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	log = vi.spyOn(console, "log").mockImplementation(() => {});
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>).enable_logs;
});

describe("logger", () => {
	it("is silent by default for info logs, but prints warn and error", async () => {
		const logger = await loadLogger();
		logger.log("a");
		logger.warn("b");
		logger.error("c");

		expect(log).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith("[WARN]", "b");
		expect(error).toHaveBeenCalledWith("[ERROR]", "c");
	});

	it("logs with level prefixes when enabled in storage", async () => {
		const logger = await loadLogger(true);
		logger.log("hello", 1);
		logger.warn("careful");
		logger.error("boom");

		expect(log).toHaveBeenCalledWith("[INFO]", "hello", 1);
		expect(warn).toHaveBeenCalledWith("[WARN]", "careful");
		expect(error).toHaveBeenCalledWith("[ERROR]", "boom");
	});

	it("stays silent for info logs when storage explicitly says false, but prints warn and error", async () => {
		const logger = await loadLogger(false);
		logger.log("hidden");
		logger.error("nope");

		expect(log).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith("[ERROR]", "nope");
	});

	it("exposes globalThis.enable_logs and persists changes", async () => {
		const logger = await loadLogger();
		const g = globalThis as unknown as { enable_logs: boolean };

		expect(g.enable_logs).toBe(false);
		g.enable_logs = true;

		expect(g.enable_logs).toBe(true);
		expect((await browser.storage.local.get("enable_logs")).enable_logs).toBe(
			true,
		);
		logger.log("now visible");
		expect(log).toHaveBeenCalledWith("[INFO]", "now visible");
	});

	it("reacts to storage changes made elsewhere (e.g. the popup)", async () => {
		const logger = await loadLogger();
		await browser.storage.local.set({ enable_logs: true });
		logger.log("enabled remotely");
		expect(log).toHaveBeenCalledWith("[INFO]", "enabled remotely");

		await browser.storage.local.set({ enable_logs: false });
		log.mockClear();
		logger.log("disabled remotely");
		expect(log).not.toHaveBeenCalled();

		warn.mockClear();
		logger.warn("disabled remotely");
		expect(warn).toHaveBeenCalledWith("[WARN]", "disabled remotely");
	});

	it("lazily evaluates function arguments only when enabled", async () => {
		const logger = await loadLogger(false);
		const expensiveOperation = vi.fn(() => "expensive string");

		logger.log("test", expensiveOperation);
		expect(expensiveOperation).not.toHaveBeenCalled();
		expect(log).not.toHaveBeenCalled();

		await browser.storage.local.set({ enable_logs: true });
		logger.log("test", expensiveOperation);

		expect(expensiveOperation).toHaveBeenCalled();
		expect(log).toHaveBeenCalledWith("[INFO]", "test", "expensive string");
	});
});
