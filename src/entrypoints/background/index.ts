// import { setupLifecycleListeners } from "./lifecycle";
import { setupStorageListener, setupTabListener } from "./listeners";
import { setupMessageListener } from "./messages";
import { gateway } from "./state";

export default defineBackground(() => {
	gateway.connect();

	// setupLifecycleListeners();
	setupTabListener();
	setupStorageListener();
	setupMessageListener();
});
