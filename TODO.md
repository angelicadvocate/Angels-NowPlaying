
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## App-Side Store Prerequisites (Required before store launch)

These are changes needed inside the app to support the store correctly.
See STORE.md for all store site implementation details.

- [ ] **Namespace/source tracking**: record whether each installed overlay is bundled or user-installed. Collisions across namespaces (bundled vs. user) should resolve predictably. Pairs with the collision-safe naming shipped in v0.9.9.
- [ ] **External URL install path**: when a catalog entry has an `externalUrl` field (paid/external overlays), the store iframe will post `{ type: 'open-external', url }` to the parent. The app needs to handle this message and call Tauri `shell::open` instead of triggering the install flow. See STORE.md for the full postMessage protocol.
- [ ] **In-app install from store**: handle `{ type: 'install-overlay', downloadUrl }` postMessage from the store iframe — download the zip to a temp path and pass it to the existing `install_overlay` Tauri command.
- [ ] **(Long-term)** Refactor overlay install key from folder-name to UUID as the primary internal key. Treat `id` in manifest.json as a human-readable slug only. Prerequisite: collision-safe naming (shipped in v0.9.9) had to be in place first.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] Pre-release slider audit: go through each overlay one at a time and verify that every slider's min/max range is correct and feels right across the realistic combinations of font styles, font sizes, spacing, and layout modes. Some overlays have multiple valid configurations (e.g. different tape styles, frame variants) so each needs to be checked in context. Not a breaking change — save for just before the first public release.
- [ ] **View Logs modal in Settings Utilities row**: once the app has meaningful runtime events worth surfacing (HTTP server lifecycle, Tuna connection state, store-download events, auto-updater progress), add a "View Logs" utility card that tails recent entries from `tauri-plugin-log`. Skip until those features exist — currently too little is logged for a dedicated viewer to be useful. Pairs well with the existing Diagnostics card for bug-report workflows.

---------------------------------------------------------------------------------

## Auto-Updater + Distribution (Next workstream)

End-to-end goal: a user clicks **Check for Updates** in Settings, the app calls a real Tauri updater against a signed GitHub Releases manifest, snapshots state via the existing `create_backup(None)`, applies the update, and restores customizations + settings on first launch of the new version. Items below are roughly in build order.

**1. Wire up the Tauri updater plugin**
- [ ] Configure `tauri.conf.json` with the Tauri updater plugin, generate signing keys, and add a `latest.json` manifest to GitHub Releases so the updater can verify downloads.
- [ ] Replace the current mock `setTimeout` in the Settings "Check for Updates" handler with a real Tauri updater call against the GitHub Releases endpoint.
- [ ] Display current version and latest available version side-by-side in the Settings version section once the updater is wired up.

**2. Snapshot / restore around updates**
- [ ] **Auto-updater snapshot integration**: pre-update call to `create_backup(None)` to snapshot state to `AppData/AngelsNowPlaying/.snapshots/update-<unix>.zip`, post-update call to `restore_backup(snapshot_path)` to re-apply bundled customizations + overlay settings only (user overlays / fonts never leave AppData so they don't need re-restoring).
- [ ] **Snapshot retention**: small cleanup pass over `.snapshots/` that keeps the last N (e.g. 5) so the folder doesn't grow unbounded across many updates.
- [ ] Once the snapshot/restore wrap is in place, the existing "bundled overlay customizations were reset to defaults" warning toast becomes unnecessary — remove it (or repurpose it as a "Customizations restored from snapshot" success toast).

**3. User-facing surfacing**
- [ ] Toast/popup on the index page when an update is available, with a one-click "Open Settings → Check for Updates" action.

**4. Cross-platform validation**
- [ ] Cross-platform smoke test: verify the app builds, installs, updates, and runs correctly on macOS and Linux. Windows is the primary test platform; macOS + Linux will reveal any path/case/permission assumptions baked into the install + updater paths.

**Conditional — only needed before renaming any existing bundled overlay:**
- [ ] **Bundled-overlay rename migration map**: add an optional `migrations` table in `backend.rs` keyed by `backup_format_version` (or by app version) that translates old overlay folder IDs → new IDs during restore. Not needed as long as no bundled overlay folders are renamed. If a rename ever happens in a future version, bump `backup_format_version` and add the entry BEFORE shipping the rename so older backups continue to restore cleanly.

---------------------------------------------------------------------------------

## Long-term / Stretch Goals
- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Hosted on GitHub Pages as a metadata-only catalog — see STORE.md for full implementation plan.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
- [ ] Consider per-overlay versioning: use the `version` field in each overlay's `manifest.json` to decide whether to re-extract that overlay on app update, instead of the current all-or-nothing `.bundle_version` stamp. Revisit alongside the auto-updater snapshot/restore work above — that's the prerequisite that makes this worth doing.
- [ ] **Decide the fate of `AppSettings.tuna_path` + `start_server` / `stop_server`**: legacy from the pre-Tuna-server-mode architecture. Tuna now exposes its own HTTP server and the app only needs the port, so `tuna_path` has no remaining consumer. Two paths forward — pick one before the 1.0 release:
  - **(a) Remove entirely.** Drop `AppSettings`, `settings.json`, `start_server`, `stop_server`, `tuna_path`, `export_root`, `serve_port`, `allow_remote`, and the restore-time machine-path validation in `restore_backup`. Cleanest option if no "serve overlays as rendered pages" feature is planned.
  - **(b) Keep `start_server` + `stop_server` as a togglable feature.** Repurpose them for an optional "Serve overlays over HTTP" mode, toggled from Overlay Management in Settings. The editor header button is now labelled **Copy Path** (default, local `file://`); when HTTP-serve mode is enabled it would swap to **Copy URL** and hand OBS a `http://127.0.0.1:<port>/...` address instead. The feature would expand compatibility with 3rd-party / store overlays that expect a served origin (fetch, CORS-bound assets) at the cost of a long-running background listener on the user's machine. Genuinely 50/50 — all bundled overlays work fine as local files, and the security / firewall-prompt surface of a default-on listener is non-trivial. Needs more thought before committing either way.
  - Either way, the currently-present `tuna_path` field is dead code and can go independently.
