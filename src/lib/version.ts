/**
 * Centralized application version metadata.
 *
 * Single source of truth for the app's version/build info, sourced from
 * environment variables (VITE_APP_VERSION / VITE_APP_BUILD) so that a
 * release only requires updating `.env` — every consumer (footer, loading
 * screen, About modal, Settings page, login/signup footers, etc.) reads
 * from here and updates automatically.
 *
 * To cut a new release, update VITE_APP_VERSION / VITE_APP_BUILD in `.env`
 * (and package.json's "version" field, to keep them in sync) — nothing
 * else needs to change.
 */

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
export const APP_BUILD: string = import.meta.env.VITE_APP_BUILD ?? "local";

/** Convenience formatted strings used across the app's UI. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const APP_NAME = "FoundryAI";
export const APP_TITLE = `${APP_NAME} • ${APP_VERSION_LABEL}`;
