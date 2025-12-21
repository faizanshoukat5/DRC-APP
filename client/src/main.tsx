import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register PWA service worker (requires installing vite-plugin-pwa)
try {
	// virtual:pwa-register is provided by vite-plugin-pwa
	// install with: npm install -D vite-plugin-pwa
	// and restart the dev server
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { registerSW } = require("virtual:pwa-register");
	if (registerSW) {
		registerSW();
	}
} catch (e) {
	// noop - plugin may not be installed yet
}

createRoot(document.getElementById("root")!).render(<App />);
