
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
- [ ] (Optional) Since the folder structure has changed for the overlays it is no longer needed to split the html and css files so granularly here. Consider flattening the main_pages and editor_pages in src and also in src/css for better navigation. If flattened properly in src, we would no longer need the duplicate index.html used as an entry point here. Dont forget to update the project structure in DEVELOPMENT.md after changes are made.

---------------------------------------------------------------------------------

## App Distribution & Updates

- [ ] Wire up the real auto-update check in settings: replace the current mock `setTimeout` in "Check for Updates" with a real Tauri updater call against a GitHub Releases endpoint.
- [ ] Configure `tauri.conf.json` with the Tauri updater plugin, generate signing keys, and add a `latest.json` manifest to GitHub Releases so the updater can verify downloads.
- [ ] Set up a GitHub Actions CI/CD pipeline that builds and signs release artifacts for Windows (`.msi`), macOS (`.dmg`), and Linux (`.AppImage`) on each tagged release.
- [ ] Display current version and latest available version side-by-side in the settings version section once the updater is wired up.
- [ ] Cross-platform smoke test: verify the app builds and runs correctly on macOS and Linux (Windows is already the primary test platform).

---------------------------------------------------------------------------------

## Long-term / Stretch Goals

- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Host this as a separate site and embed it in the app (e.g., via iframe) so store updates are independent of app releases.
- [ ] Preset theme library: ship a set of named color palettes that users can apply to any overlay in one click from the editor.
- [ ] Import/export overlay configs between machines: let users export a config bundle (JSON + CSS) and import it on another install.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
