import { mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import "fake-indexeddb/auto";

GlobalRegistrator.register();

// Common mocks for UI tests
if (typeof window !== "undefined") {
    // Mock matchMedia for mobile
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: mock().mockImplementation((query) => ({
            matches: !!query.includes("max-width"),
            media: query,
            onchange: null,
            addListener: mock(),
            removeListener: mock(),
            addEventListener: mock(),
            removeEventListener: mock(),
            dispatchEvent: mock(),
        })),
    });

    // Mock mobile screen size
    Object.defineProperty(window, "innerWidth", { writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, value: 844 });

    // Mock clipboard
    if (!navigator.clipboard) {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: mock().mockResolvedValue(undefined),
            },
            configurable: true,
        });
    }

    // Mock alert and confirm
    window.alert = mock();
    window.confirm = mock().mockReturnValue(true);
}
