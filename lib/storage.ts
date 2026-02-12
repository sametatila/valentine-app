import { AppState, INITIAL_STATE } from "@/types";

const STORAGE_KEY = "valentine_state_v1";
const SESSION_RESET_KEY = "force_reset";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function validateState(state: unknown): state is AppState {
  if (typeof state !== "object" || state === null) return false;
  const s = state as Record<string, unknown>;
  return (
    typeof s.step === "number" &&
    s.step >= 0 &&
    s.step <= 5 &&
    Array.isArray(s.answers) &&
    s.answers.length === 5 &&
    typeof s.scene === "string" &&
    ["questions", "hug", "heart", "done_nonperfect"].includes(s.scene as string) &&
    typeof s.closeness === "number" &&
    s.closeness >= 0 &&
    s.closeness <= 5
  );
}

export function loadState(): AppState {
  if (!isBrowser()) return { ...INITIAL_STATE };

  try {
    // Check for force reset via sessionStorage
    if (sessionStorage.getItem(SESSION_RESET_KEY) === "1") {
      sessionStorage.removeItem(SESSION_RESET_KEY);
      localStorage.removeItem(STORAGE_KEY);
      return { ...INITIAL_STATE };
    }

    // Check for ?reset=1 query param
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      // Remove the param from URL without reload
      params.delete("reset");
      const newUrl =
        params.toString().length > 0
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      return { ...INITIAL_STATE };
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...INITIAL_STATE };

    const parsed: unknown = JSON.parse(saved);
    if (validateState(parsed)) return { ...parsed };

    localStorage.removeItem(STORAGE_KEY);
    return { ...INITIAL_STATE };
  } catch {
    return { ...INITIAL_STATE };
  }
}

export function saveState(state: AppState): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function clearState(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function setForceResetFlag(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(SESSION_RESET_KEY, "1");
  } catch {
    // ignore
  }
}
