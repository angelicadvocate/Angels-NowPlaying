
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## Store Page (Planned for after v1.0.0)
- [ ] Upload validation: reject submissions whose `id` already exists in the published store catalog — this is the primary guard against ID collisions and is sufficient for v1.
- [ ] Namespace by source at the client level: bundled overlays live in `src/overlays/`, user-installed overlays go in `%APPDATA%/AngelsNowPlaying/overlays/`. Track source on each entry so collisions across namespaces can be resolved predictably if they ever occur.
- [ ] (Future) Assign a store-generated UUID to each published overlay at upload time. Use the UUID as the internal install/update key; treat `id` in manifest.json as a human-readable slug only. This protects against authors renaming overlays breaking update tracking.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] (Optional) Add onboarding or tooltips for first-time users to make the app even more user-friendly.
- [ ] Refine what controls are on each overlay page and what values each slider has for min/max.
- [~] **Bundle Font Awesome locally** — Won't fix. WebView2 tracking prevention produces console noise for CDN font loads from `http://127.0.0.1` (user overlay server), but functionality is unaffected. User-created overlays may also reference arbitrary CDN assets we can't predict, so there's no general fix worth pursuing here.
- [ ] Update artwork on frame-program-window to allow for a new dropdown selection to change the style of the program window. This would only need to swap the background image loaded in the overlay. Could have current option be the default and add styles for retro (win95/98), fruit (apple/macos), etc. If done properly nothing should change except the background image. All existing sliders and functions should still work.

---------------------------------------------------------------------------------

## App Distribution & Updates

- [ ] Wire up the real auto-update check in settings: replace the current mock `setTimeout` in "Check for Updates" with a real Tauri updater call against a GitHub Releases endpoint.
- [ ] Configure `tauri.conf.json` with the Tauri updater plugin, generate signing keys, and add a `latest.json` manifest to GitHub Releases so the updater can verify downloads.
- [ ] Set up a GitHub Actions CI/CD pipeline that builds and signs release artifacts for Windows (`.msi`), macOS (`.dmg`), and Linux (`.AppImage`) on each tagged release.
- [ ] Display current version and latest available version side-by-side in the settings version section once the updater is wired up.
- [ ] Cross-platform smoke test: verify the app builds and runs correctly on macOS and Linux (Windows is already the primary test platform).
- [ ] Consider adding a toast/popup message to the index page to show when updates are available.

---------------------------------------------------------------------------------

## Long-term / Stretch Goals

- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Host this as a separate site and embed it in the app (e.g., via iframe) so store updates are independent of app releases.
- [ ] Preset theme library: ship a set of named color palettes that users can apply to any overlay in one click from the editor.
- [ ] Import/export overlay configs between machines: let users export a config bundle (JSON + CSS) and import it on another install.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
