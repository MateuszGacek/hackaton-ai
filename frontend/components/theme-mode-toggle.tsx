"use client";

import { useState } from "react";

const STORAGE_KEY = "swiftlayer-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ThemeMode = "light" | "dark";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function resolveThemeFromSystem(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(THEME_MEDIA_QUERY).matches
    ? "dark"
    : "light";
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeMode(stored)) return stored;
  } catch {}

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemeMode(rootTheme)) return rootTheme;

  return resolveThemeFromSystem();
}

function formatThemeLabel(themeMode: ThemeMode) {
  return themeMode.charAt(0).toUpperCase() + themeMode.slice(1);
}

export function ThemeModeToggle({ className = "" }: { className?: string }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(resolveInitialTheme);

  const persistTheme = (nextThemeMode: ThemeMode) => {
    applyTheme(nextThemeMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextThemeMode);
    } catch {}
    setThemeMode(nextThemeMode);
  };

  const toggleTheme = () => {
    const nextThemeMode: ThemeMode = themeMode === "dark" ? "light" : "dark";
    persistTheme(nextThemeMode);
  };

  const nextModeLabel = themeMode === "dark" ? "light" : "dark";

  return (
    <div className={`theme-control ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-switch ${
          themeMode === "dark" ? "theme-switch--dark" : "theme-switch--light"
        }`}
        aria-label={`Theme: ${formatThemeLabel(themeMode)}. Activate to switch to ${formatThemeLabel(
          nextModeLabel
        )} mode.`}
        title={`Theme: ${formatThemeLabel(themeMode)} (click to switch to ${formatThemeLabel(nextModeLabel)})`}
      >
        <span className="theme-switch__track" aria-hidden="true" />
        <span className="theme-switch__thumb" aria-hidden="true">
          <svg className="theme-switch__icon theme-switch__icon--sun" viewBox="0 0 24 24" role="presentation">
            <circle cx="12" cy="12" r="4.25" fill="currentColor" />
            <path
              d="M12 1.8v2.2M12 20v2.2M4 12H1.8M22.2 12H20M4.95 4.95L3.4 3.4M20.6 20.6l-1.55-1.55M4.95 19.05L3.4 20.6M20.6 3.4l-1.55 1.55"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
          <svg className="theme-switch__icon theme-switch__icon--moon" viewBox="0 0 24 24" role="presentation">
            <path
              d="M20 14.6A8.8 8.8 0 0 1 9.4 4 9 9 0 1 0 20 14.6Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="theme-switch__mode" aria-hidden="true">
          {formatThemeLabel(themeMode)}
        </span>
      </button>
    </div>
  );
}
