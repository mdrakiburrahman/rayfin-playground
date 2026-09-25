export function shouldUseLocalDevRuntime(
    isDevelopment: boolean,
    isTopLevelWindow: boolean,
): boolean {
    return isDevelopment && isTopLevelWindow;
}

export function isLocalStandaloneDev(): boolean {
    return shouldUseLocalDevRuntime(
        import.meta.env.DEV,
        window.self === window.top,
    );
}
