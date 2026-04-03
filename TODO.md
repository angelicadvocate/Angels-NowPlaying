
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## Store Page
- [ ] Upload validation: reject submissions whose `id` already exists in the published store catalog — this is the primary guard against ID collisions and is sufficient for v1.
- [ ] Namespace by source at the client level: bundled overlays live in `src/overlays/`, user-installed overlays go in `%APPDATA%/AngelsNowPlaying/overlays/`. Track source on each entry so collisions across namespaces can be resolved predictably if they ever occur.
- [ ] (Future) Assign a store-generated UUID to each published overlay at upload time. Use the UUID as the internal install/update key; treat `id` in manifest.json as a human-readable slug only. This protects against authors renaming overlays breaking update tracking.

---------------------------------------------------------------------------------

## App UI — Light Mode

The dark mode toggle in Settings saves to `settings.json` (via `save_overlay_settings`) but light mode is currently a no-op — `applyDarkMode(false)` only sets `colorScheme: light` which does nothing visually since the CSS is hardcoded dark.

- [ ] Audit all app-side CSS files (`settings.css`, `index.css`, `store.css`, `instructions.css`, `editor-common.css`, `editor-header.css`) and identify every hardcoded dark colour (backgrounds, borders, text, inputs).
- [ ] Define a CSS custom property palette for both themes on `:root` (e.g. `--bg-primary`, `--bg-card`, `--text-primary`, `--border-color`, `--input-bg`).
- [ ] Replace all hardcoded dark values in the app CSS files with the new custom properties.
- [ ] Add a `[data-theme="light"]` selector block (or toggle a class on `<html>`) that overrides the palette to light values.
- [ ] Update `applyDarkMode()` in `settings.html` (and any other pages that need it) to set `document.documentElement.dataset.theme = isDark ? 'dark' : 'light'` instead of `colorScheme`.
- [ ] On startup in each app page, read `settings.json` (or pass the value via Tauri's window state) and apply the correct theme before first paint to avoid a flash of dark content.
- [ ] Verify editor header and modal components also respect the theme.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] (Optional) Add onboarding or tooltips for first-time users to make the app even more user-friendly.
- [ ] (Optional) Since the folder structure has changed for the overlays it is no longer needed to split the html and css files so granularly here. Consider flattening the main_pages and editor_pages in src and also in src/css for better navigation. If flattened properly in src, we would no longer need the duplicate index.html used as an entry point here.

## Pre-Ship QA — OBS + Editor Testing

Each bundled overlay must pass a two-phase test before the project ships. Do this with Tuna running and a real song playing.

**Phase 1 — Default (unedited) overlay in OBS**
- Add `main.html` as a Browser Source in OBS at the overlay's recommended canvas size
- Verify: album art loads, title and artist display correctly, progress bar advances, long titles scroll
- Verify: no console errors in OBS browser source developer tools

**Phase 2 — Edit via the app, then re-test in OBS**
- Open the overlay's editor in the Angels-NowPlaying app
- Change at least one visual property (e.g. a color, font size, or layout value) and save
- Confirm the editor preview updates to reflect the change
- Reload the OBS browser source and confirm the rendered overlay matches the editor preview
- If preview and OBS output don't match, inspect `generateCSS()` in `editor.html` for the affected overlay

Per-overlay checklist (both phases must pass):
- [ ] `frame-banner-visualizer`
- [ ] `frame-cassette-tape`
- [ ] `frame-color-bar-visualizer`
- [ ] `frame-glassmorphism-1`
- [ ] `frame-glassmorphism-2`
- [ ] `frame-horizontal-classic`
- [ ] `frame-horizontal-wide`
- [ ] `frame-neon-lights`
- [ ] `frame-program-window`
- [ ] `frame-retro-vinyl`
- [ ] `frame-vertical-panel`

---------------------------------------------------------------------------------

## App Distribution & Updates

- [ ] Wire up the real auto-update check in settings: replace the current mock `setTimeout` in "Check for Updates" with a real Tauri updater call against a GitHub Releases endpoint.
- [ ] Configure `tauri.conf.json` with the Tauri updater plugin, generate signing keys, and add a `latest.json` manifest to GitHub Releases so the updater can verify downloads.
- [ ] Set up a GitHub Actions CI/CD pipeline that builds and signs release artifacts for Windows (`.msi`), macOS (`.dmg`), and Linux (`.AppImage`) on each tagged release.
- [ ] Display current version and latest available version side-by-side in the settings version section once the updater is wired up.
- [ ] Cross-platform smoke test: verify the app builds and runs correctly on macOS and Linux (Windows is already the primary test platform).

---------------------------------------------------------------------------------

## Editor Enhancements

- [ ] Add a `setPreviewVar(name, value)` helper to the editor header loader (or as a small shared utility): calls `document.documentElement.style.setProperty(name, value)` on the host document **and** relays the change to the preview iframe via `postMessage`. All editor controls call this instead of setting CSS vars directly, so the iframe preview stays in sync without any extra wiring per-editor.
- [ ] Update all 11 existing `editor.html` files to replace their static mock preview DOM with `<iframe src="main.html?edit=1">` and migrate their control inputs to use `setPreviewVar()`. This ensures editor preview and OBS output always come from the same HTML structure. Use `frame-template-starter` as the most up to date version for implimentation to the other 11 frames. The patterns used in `frame-template-starter` for html and css files should also be updated in the remaining 11 overlays.

---------------------------------------------------------------------------------

## Long-term / Stretch Goals

- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Host this as a separate site and embed it in the app (e.g., via iframe) so store updates are independent of app releases.
- [ ] Preset theme library: ship a set of named color palettes that users can apply to any overlay in one click from the editor.
- [ ] Import/export overlay configs between machines: let users export a config bundle (JSON + CSS) and import it on another install.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
