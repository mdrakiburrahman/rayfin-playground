//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

function getPreferredTheme(): boolean {
    const appearance = document.documentElement.getAttribute("data-appearance");
    if (appearance === "dark") return true;
    if (appearance === "light") return false;
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Detects the current color scheme preference and toggles the `dark`
 * class on `<html>`. Listens for changes to `prefers-color-scheme` and
 * the `data-appearance` attribute on `<html>`.
 */
export function useAppTheme() {
    const [isDark, setIsDark] = useState(getPreferredTheme);
    const hasUserOverride = useRef(false);

    useEffect(() => {
        // Sync the .dark class on <html> for Tailwind dark mode
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    useEffect(() => {
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const onMediaChange = (event: MediaQueryListEvent) => {
            if (!hasUserOverride.current) {
                setIsDark(event.matches);
            }
        };
        mql.addEventListener("change", onMediaChange);

        const observer = new MutationObserver(() => {
            if (hasUserOverride.current) return;
            const appearance = document.documentElement.getAttribute("data-appearance");
            if (appearance === "dark") setIsDark(true);
            else if (appearance === "light") setIsDark(false);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-appearance"],
        });

        return () => {
            mql.removeEventListener("change", onMediaChange);
            observer.disconnect();
        };
    }, []);

    const toggleTheme = () => {
        hasUserOverride.current = true;
        setIsDark((previous) => !previous);
    };

    return { isDark, toggleTheme };
}
