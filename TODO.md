
# TODOs for Angels-NowPlaying

This file tracks planned and in-progress work.
Completed items are moved to CHANGELOG.md at the end of a work session.

---------------------------------------------------------------------------------

## App-Side Store Prerequisites (Required before store launch)

These are changes needed inside the app to support the store correctly.
See STORE.md for all store site implementation details.

- [ ] **Namespace/source tracking**: record whether each installed overlay is bundled or user-installed. Collisions across namespaces (bundled vs. user) should resolve predictably.
- [ ] **External URL install path**: when a catalog entry has an `externalUrl` field (paid/external overlays), the store iframe will post `{ type: 'open-external', url }` to the parent. The app needs to handle this message and call Tauri `shell::open` instead of triggering the install flow. See STORE.md for the full postMessage protocol.
- [ ] **In-app install from store**: handle `{ type: 'install-overlay', downloadUrl }` postMessage from the store iframe — download the zip to a temp path and pass it to the existing `install_overlay` Tauri command.
- [ ] **(Long-term)** Refactor overlay install key from folder-name to UUID as the primary internal key. Treat `id` in manifest.json as a human-readable slug only.

---------------------------------------------------------------------------------

## Other To-Do Items
- [ ] Pre-release slider audit: go through each overlay one at a time and verify that every slider's min/max range is correct and feels right across the realistic combinations of font styles, font sizes, spacing, and layout modes. Some overlays have multiple valid configurations (e.g. different tape styles, frame variants) so each needs to be checked in context. Not a breaking change — save for just before the first public release.
- [ ] **View Logs modal in Settings Utilities row**: once the app has meaningful runtime events worth surfacing (HTTP server lifecycle, Tuna connection state, store-download events, auto-updater progress), add a "View Logs" utility card that tails recent entries from `tauri-plugin-log`. Skip until those features exist — currently too little is logged for a dedicated viewer to be useful. Pairs well with the existing Diagnostics card for bug-report workflows.
- [ ] **Cross-platform smoke test (macOS + Linux)**: full end-to-end pass on each platform once macOS hardware is available — not just the auto-updater, but the whole app surface. Verify build + install + first-run bundled-overlay extraction, Tuna connection + now-playing data flow, overlay editor save/reset/preview, font install/delete, store install + delete, backup/restore round-trip, diagnostics output, and auto-update apply + post-update snapshot replay. Windows is the primary dev/test platform; macOS + Linux will reveal any path/case/permission/firewall assumptions baked into the install, server, or updater paths. Delayed indefinitely until macOS hardware is on hand for a real end-to-end test.

---------------------------------------------------------------------------------

## Long-term / Stretch Goals
- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Hosted on GitHub Pages as a metadata-only catalog — see STORE.md for full implementation plan.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
- [ ] Consider per-overlay versioning: use the `version` field in each overlay's `manifest.json` to decide whether to re-extract that overlay on app update, instead of the current all-or-nothing `.bundle_version` stamp. Revisit alongside the auto-updater snapshot/restore work above — that's the prerequisite that makes this worth doing.
