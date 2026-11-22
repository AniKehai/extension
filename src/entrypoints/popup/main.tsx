import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "@/shared/ui/style.css";
import { captureError, initSentry } from "@/utils/sentry";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Failed to mount popup root element.");
}

initSentry("popup");

window.addEventListener("error", (event) => {
	captureError(event.error ?? new Error(event.message ?? "Unknown error"), {
		entrypoint: "popup",
		action: "uncaught_error",
	});
});

window.addEventListener("unhandledrejection", (event) => {
	captureError(event.reason, {
		entrypoint: "popup",
		action: "unhandled_rejection",
	});
});

ReactDOM.createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
