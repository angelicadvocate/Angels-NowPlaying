
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## App-Side Store Prerequisites (Required before store launch)

These are changes needed inside the app to support the store correctly.
See STORE.md for all store site implementation details.

- [ ] **Collision-safe install folder naming**: update `install_overlay` in `backend.rs` to append a short UUID to the installed folder name (e.g. `frame-my-overlay-a3f2c1d4/`) so two overlays with the same `id` can coexist without overwriting each other. This is the hard prerequisite before the store ships. See STORE.md for context on why catalog-side ID validation alone is not sufficient.
- [ ] **Namespace/source tracking**: record whether each installed overlay is bundled or user-installed. Collisions across namespaces (bundled vs. user) should resolve predictably. Pairs with the collision-safe naming above.
- [ ] **External URL install path**: when a catalog entry has an `externalUrl` field (paid/external overlays), the store iframe will post `{ type: 'open-external', url }` to the parent. The app needs to handle this message and call Tauri `shell::open` instead of triggering the install flow. See STORE.md for the full postMessage protocol.
- [ ] **In-app install from store**: handle `{ type: 'install-overlay', downloadUrl }` postMessage from the store iframe — download the zip to a temp path and pass it to the existing `install_overlay` Tauri command.
- [ ] **(Long-term)** Refactor overlay install key from folder-name to UUID as the primary internal key. Treat `id` in manifest.json as a human-readable slug only. Prerequisite: collision-safe naming above must be in place first.

---------------------------------------------------------------------------------

## Known Bugs / Active Issues
 - [ ] Uninstaller Roaming cleanup: when the user checks "remove app data" during uninstall, also delete `%APPDATA%\Roaming\AngelsNowPlaying`. Currently only `%APPDATA%\Local` is cleaned up, leaving overlay files and settings behind in Roaming. The checkbox is already unchecked by default so normal reinstalls are unaffected — this is purely a cleanup correctness fix for permanent uninstalls.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] Pre-release slider audit: go through each overlay one at a time and verify that every slider's min/max range is correct and feels right across the realistic combinations of font styles, font sizes, spacing, and layout modes. Some overlays have multiple valid configurations (e.g. different tape styles, frame variants) so each needs to be checked in context. Not a breaking change — save for just before the first public release.
- [ ] Display overlay version in editor header: show the `version` field from the overlay's `manifest.json` underneath the overlay name in the editor shell header. Needed before the store launches so users can compare their installed version against the store listing. The shell already reads `manifest.json` for reset-to-defaults, so this is a small addition when the time comes.
- [ ] Bundled font support: curate a set of fonts to ship with the app (sourced from Google Fonts as `.woff2` files). Extract them to `AppData/AngelsNowPlaying/fonts/` alongside overlays during `extract_bundled_overlays()` — same pattern as jQuery today. Add a shared `fonts.css` with `@font-face` declarations referenced by each overlay's `main.html` and `editor.html` via a relative path (`../../fonts/`). This ensures fonts work in both OBS `file://` mode and the HTTP server, cross-platform, with no internet dependency. Steps when ready: (1) decide which fonts to include, (2) download `.woff2` files and add as Tauri resources, (3) write `fonts.css`, (4) update all overlay `main.html`/`editor.html` files to link it, (5) update font dropdowns in each `editor.html` to list the available fonts by name, (6) update `FRAME-DEVELOPMENT.md` to document which fonts are available for overlay authors and note that additional fonts must be bundled with the overlay zip itself.

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
- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Hosted on GitHub Pages as a metadata-only catalog — see STORE.md for full implementation plan.
- [ ] Preset theme library: ship a set of named color palettes that users can apply to any overlay in one click from the editor.
- [ ] Import/export overlay configs between machines: let users export a config bundle (JSON + CSS) and import it on another install. (Can also be used during the update step to backup/restore across updates.) Once implemented, add a notice in Settings warning users to export their overlays before uninstalling if they plan to reinstall later.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
- [ ] Consider per-overlay versioning: use the `version` field in each overlay's `manifest.json` to decide whether to re-extract that overlay on app update, instead of the current all-or-nothing `.bundle_version` stamp. Revisit alongside the config backup/restore system — backup/restore is the prerequisite that makes this worth doing.
