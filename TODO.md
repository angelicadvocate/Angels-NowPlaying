
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
 - [ ] Cross-platform app-data cleanup parity: the "Reset App Data" button in Settings already works on all three OSes (Windows, macOS, Linux). Native uninstallers only exist on Windows, and we intentionally do NOT auto-delete `%APPDATA%\Roaming\AngelsNowPlaying` on uninstall to protect user overlay libraries (including future paid overlays). Revisit only if user feedback indicates the informational-only uninstaller message is missed on macOS/Linux (likely a `README` / docs note is sufficient there).

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] Pre-release slider audit: go through each overlay one at a time and verify that every slider's min/max range is correct and feels right across the realistic combinations of font styles, font sizes, spacing, and layout modes. Some overlays have multiple valid configurations (e.g. different tape styles, frame variants) so each needs to be checked in context. Not a breaking change — save for just before the first public release.
- [ ] **View Logs modal in Settings Utilities row**: once the app has meaningful runtime events worth surfacing (HTTP server lifecycle, Tuna connection state, store-download events, auto-updater progress), add a "View Logs" utility card that tails recent entries from `tauri-plugin-log`. Skip until those features exist — currently too little is logged for a dedicated viewer to be useful. Pairs well with the existing Diagnostics card for bug-report workflows.

---------------------------------------------------------------------------------

## Backup & Restore (Next workstream — auto-updater prerequisite)

The Backup / Restore cards are currently stubbed in Settings with a "Coming Soon" modal. Implementing them is the prerequisite that lets the auto-updater preserve user customizations across version bumps (bundled overlays currently re-extract on every `.bundle_version` change and wipe any CSS tweaks).

- [ ] **Backup command**: Tauri command that zips the user-relevant portion of `AppData/AngelsNowPlaying/` and writes it to a user-picked destination via `pick_save_file`. Decide exact contents — candidates: `user-overlays/`, `fonts/user/`, `settings.json`, `overlays/settings.json` (overlay-level dark mode / tuna port), and any customized bundled overlays (requires comparing against the bundle to detect edits).
- [ ] **Restore command**: Tauri command that reads a backup zip, validates its shape (top-level folders, version stamp), and unpacks it into `AppData/AngelsNowPlaying/`. Needs a clear overwrite / merge policy and a confirmation modal warning about existing data.
- [ ] **Wire up the Backup / Restore utility cards** in Settings to call the new commands and replace the placeholder Coming Soon modal with real file-picker flows + progress / status feedback.
- [ ] **Backup metadata stamp**: embed a small `backup-info.json` in the zip (app version, backup date, included categories) so Restore can warn on version mismatches or partial backups.
- [ ] Once complete, revisit the auto-updater warning toast and the per-overlay versioning item below — both unblock naturally once backup/restore is in place.

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
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
- [ ] Consider per-overlay versioning: use the `version` field in each overlay's `manifest.json` to decide whether to re-extract that overlay on app update, instead of the current all-or-nothing `.bundle_version` stamp. Revisit alongside the config backup/restore system — backup/restore is the prerequisite that makes this worth doing.
