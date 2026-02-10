
export function getTauriSession() {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem("tauri_session");
    if (!sessionStr) return null;

    try {
        return JSON.parse(sessionStr);
    } catch (e) {
        return null;
    }
}

export function isTauri() {
    return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
}
