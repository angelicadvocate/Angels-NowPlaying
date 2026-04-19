
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
