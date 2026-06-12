"use client";

import { Moon, Sun } from "@carbon/icons-react";
import { Theme } from "@carbon/react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type DssResolvedTheme = "white" | "g10" | "g90" | "g100";
export type DssThemePreference = "system" | DssResolvedTheme;

type DssThemeContextValue = {
  preference: DssThemePreference;
  resolvedTheme: DssResolvedTheme;
  setPreference: (preference: DssThemePreference) => void;
};

const storageKey = "dss-theme-preference";
const darkSchemeQuery = "(prefers-color-scheme: dark)";
const defaultPreference: DssThemePreference = "system";
const defaultSystemTheme: DssResolvedTheme = "g10";
const preferenceListeners = new Set<() => void>();
let volatilePreference: DssThemePreference = defaultPreference;

const cycleThemeOptions: Array<{ icon: "sun" | "moon"; label: string; value: DssResolvedTheme }> = [
  { icon: "sun", label: "White", value: "white" },
  { icon: "sun", label: "Gray 10", value: "g10" },
  { icon: "moon", label: "Gray 90", value: "g90" },
  { icon: "moon", label: "Gray 100", value: "g100" },
];

const DssThemeContext = createContext<DssThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is DssThemePreference {
  return value === "system" || value === "white" || value === "g10" || value === "g90" || value === "g100";
}

function getStoredPreference(): DssThemePreference {
  if (typeof window === "undefined") {
    return defaultPreference;
  }

  try {
    const storedPreference = window.localStorage.getItem(storageKey);
    return isThemePreference(storedPreference) ? storedPreference : defaultPreference;
  } catch {
    return volatilePreference;
  }
}

function getSystemTheme(): DssResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return defaultSystemTheme;
  }

  return window.matchMedia(darkSchemeQuery).matches ? "g100" : defaultSystemTheme;
}

function getServerPreferenceSnapshot(): DssThemePreference {
  return defaultPreference;
}

function getServerSystemThemeSnapshot(): DssResolvedTheme {
  return defaultSystemTheme;
}

function notifyPreferenceListeners() {
  for (const listener of preferenceListeners) {
    listener();
  }
}

function subscribeToPreference(listener: () => void) {
  preferenceListeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    preferenceListeners.delete(listener);

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function subscribeToSystemTheme(listener: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(darkSchemeQuery);
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

function storePreference(nextPreference: DssThemePreference) {
  volatilePreference = nextPreference;

  try {
    window.localStorage.setItem(storageKey, nextPreference);
  } catch {
    // Theme choice is a convenience preference; the UI should keep working if storage is unavailable.
  }

  notifyPreferenceListeners();
}

export function DssThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeToPreference,
    getStoredPreference,
    getServerPreferenceSnapshot,
  );
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getServerSystemThemeSnapshot,
  );
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  const setPreference = useCallback((nextPreference: DssThemePreference) => {
    storePreference(nextPreference);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <DssThemeContext.Provider value={value}>
      <Theme
        as="div"
        className="dss-theme-root"
        data-dss-resolved-theme={resolvedTheme}
        data-dss-theme-preference={preference}
        data-testid="dss-theme-root"
        theme={resolvedTheme}
      >
        {children}
      </Theme>
    </DssThemeContext.Provider>
  );
}

export function useDssTheme() {
  const context = useContext(DssThemeContext);

  if (!context) {
    throw new Error("useDssTheme must be used within DssThemeProvider");
  }

  return context;
}

export function getShellTheme(resolvedTheme: DssResolvedTheme): DssResolvedTheme {
  return resolvedTheme === "white" || resolvedTheme === "g10" ? "g100" : resolvedTheme;
}

function getThemeOption(theme: DssResolvedTheme) {
  return cycleThemeOptions.find((option) => option.value === theme) ?? cycleThemeOptions[0];
}

function getNextTheme(theme: DssResolvedTheme): DssResolvedTheme {
  const currentIndex = cycleThemeOptions.findIndex((option) => option.value === theme);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cycleThemeOptions.length;
  return cycleThemeOptions[nextIndex].value;
}

export function DssThemeCycleButton() {
  const { resolvedTheme, setPreference } = useDssTheme();
  const currentOption = getThemeOption(resolvedTheme);
  const nextOption = getThemeOption(getNextTheme(resolvedTheme));
  const Icon = currentOption.icon === "sun" ? Sun : Moon;

  return (
    <button
      aria-label={`화면 테마: ${currentOption.label}. 누르면 ${nextOption.label}로 변경`}
      className="dss-theme-cycle-button"
      data-dss-theme={currentOption.value}
      data-dss-theme-icon={currentOption.icon}
      onClick={() => setPreference(nextOption.value)}
      title={`화면 테마: ${currentOption.label}`}
      type="button"
    >
      <Icon aria-hidden="true" className="dss-theme-cycle-button__icon" size={16} />
    </button>
  );
}
