import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAppTheme } from "@/hooks/use-theme";

const matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

describe("useAppTheme", () => {
    beforeEach(() => {
        vi.stubGlobal("matchMedia", matchMedia);
        document.documentElement.classList.remove("dark");
        document.documentElement.removeAttribute("data-appearance");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.documentElement.classList.remove("dark");
        document.documentElement.removeAttribute("data-appearance");
    });

    it("follows the host appearance before the user overrides it", async () => {
        document.documentElement.setAttribute("data-appearance", "light");
        const { result } = renderHook(() => useAppTheme());

        expect(result.current.isDark).toBe(false);

        act(() => {
            document.documentElement.setAttribute("data-appearance", "dark");
        });

        await waitFor(() => expect(result.current.isDark).toBe(true));
    });

    it("keeps an explicit user theme choice even when the host attribute is unchanged", async () => {
        document.documentElement.setAttribute("data-appearance", "light");
        const { result } = renderHook(() => useAppTheme());

        act(() => {
            result.current.toggleTheme();
        });

        await waitFor(() => {
            expect(result.current.isDark).toBe(true);
            expect(document.documentElement).toHaveClass("dark");
        });
    });
});
