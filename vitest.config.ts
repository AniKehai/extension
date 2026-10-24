import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
	plugins: [WxtVitest()],
	test: {
		environment: "happy-dom",
		setupFiles: ["./tests/setup.ts"],
		include: ["tests/**/*.test.{ts,tsx}"],
		exclude: ["node_modules", ".output", ".wxt", "tests/e2e/**"],
		restoreMocks: true,
		unstubGlobals: true,
		clearMocks: true,
		coverage: {
			clean: false,
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/entrypoints/popup/main.tsx",
				"src/entrypoints/popup/style.css",
				"src/shared/types.ts",
			],
			reporter: ["text", "lcov", "html"],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 70,
			},
		},
	},
});
