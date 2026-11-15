import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "@/shared/ui/style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Failed to mount welcome root element.");
}

ReactDOM.createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
