
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## Store Page (Planned for after v1.0.0)
- [ ] Upload validation: reject submissions whose `id` already exists in the published store catalog — this is the primary guard against ID collisions and is sufficient for v1.
- [ ] Namespace by source at the client level: bundled overlays live in `src/overlays/`, user-installed overlays go in `%APPDATA%/AngelsNowPlaying/overlays/`. Track source on each entry so collisions across namespaces can be resolved predictably if they ever occur.
- [ ] (Future) Assign a store-generated UUID to each published overlay at upload time. Use the UUID as the internal install/update key; treat `id` in manifest.json as a human-readable slug only. This protects against authors renaming overlays breaking update tracking.

---------------------------------------------------------------------------------

## Known Bugs / Active Issues

- [x] **jQuery missing in OBS for bundled overlays**: `main.html` references `../../js/vendor/jquery-3.5.1.min.js` relative to AppData, but that path doesn't exist yet for bundled overlays. Fix: extract jQuery to `AppData/AngelsNowPlaying/js/vendor/jquery-3.5.1.min.js` alongside overlays during `extract_bundled_overlays()`.
- [x] **Header images broken in bundled overlay editors**: mascot and logo images show broken in bundled overlay editor headers. They work in user-installed overlays because they were inlined as base64 at install time. Now that all overlays live in AppData the image paths need to resolve from disk rather than requiring inlining. Investigate whether serving header assets through the HTTP server or writing them to AppData solves this without the inlining workaround.
- [ ] **Auto hue-rotation CSS property not persisting on save**: revisiting a saved overlay after saving shows hue rotation has not been applied. May be related to missing jQuery (`$` not defined prevents the preview polling loop from running the read-back), or a separate issue with how the CSS var is written/read. Investigate after jQuery is fixed.
- [ ] **Editor CSS separation**: some bundled overlay `editor.css` files still contain styles for header partial elements (mascot, nav buttons, title bar) that should be owned by the app, not by individual overlays. Overlay authors should only need to style their own controls section. Needs a refactor of the editor page structure — options include: (a) moving all header styles into `editor-common.css` and auditing each overlay's `editor.css` to strip duplicates; (b) switching to an iframe-based header so the header's CSS is fully isolated from the overlay page. Add this to the pre-1.0 cleanup pass.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] (Optional) Add onboarding or tooltips for first-time users to make the app even more user-friendly.
- [ ] Refine what controls are on each overlay page and what values each slider has for min/max.
- [ ] Update artwork on frame-program-window to allow for a new dropdown selection to change the style of the program window. This would only need to swap the background image loaded in the overlay. Could have current option be the default and add styles for retro (win95/98), fruit (apple/macos), etc. If done properly nothing should change except the background image. All existing sliders and functions should still work.
- [ ] Fix artist text slider on cassete tape overlay

---------------------------------------------------------------------------------

## App Distribution & Updates

- [ ] Wire up the real auto-update check in settings: replace the current mock `setTimeout` in "Check for Updates" with a real Tauri updater call against a GitHub Releases endpoint.
- [ ] Configure `tauri.conf.json` with the Tauri updater plugin, generate signing keys, and add a `latest.json` manifest to GitHub Releases so the updater can verify downloads.
- [ ] Set up a GitHub Actions CI/CD pipeline that builds and signs release artifacts for Windows (`.msi`), macOS (`.dmg`), and Linux (`.AppImage`) on each tagged release.
- [ ] Display current version and latest available version side-by-side in the settings version section once the updater is wired up.
- [ ] Cross-platform smoke test: verify the app builds and runs correctly on macOS and Linux (Windows is already the primary test platform).
- [ ] Consider adding a toast/popup message to the index page to show when updates are available.
- [ ] Show a toast/warning when the app updates informing the user that bundled overlay customizations were reset to defaults. Hook this into the auto-updater flow once it is implemented. (Long-term: the planned config backup/restore system should automatically preserve and restore customizations across updates.)

---------------------------------------------------------------------------------

## Long-term / Stretch Goals

- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Host this as a separate site and embed it in the app (e.g., via iframe) so store updates are independent of app releases.
- [ ] Preset theme library: ship a set of named color palettes that users can apply to any overlay in one click from the editor.
- [ ] Import/export overlay configs between machines: let users export a config bundle (JSON + CSS) and import it on another install. (Can also be used during the update step to backup/restore across updates)
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
