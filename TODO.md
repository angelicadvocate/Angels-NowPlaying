
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
- [ ] **Logging coverage audit**: before the View Logs modal is worth building, do a sweep of the codebase for places that should be emitting `log::info!` / `log::warn!` / `log::error!` and aren't. Current coverage is uneven — the optional HTTP server, post-update restore replay, and bundled-overlay extraction log nicely; most other paths (overlay install/delete, font install/delete, settings save, backup create, store install, Tuna connection state, editor save/reset) are silent. Aim for: every user-initiated mutation logs a one-line summary on success, every failure path logs at warn/error with the underlying cause, and every long-running background task logs lifecycle transitions. Pairs directly with the View Logs modal item below — the modal isn't useful until the logs themselves are.
- [ ] **Frontend → backend log bridge**: front-end JS errors and important UI events currently never reach `tauri-plugin-log`. Add a thin `log_message(level, source, message)` Tauri command + a small JS helper that mirrors uncaught errors and key user actions (overlay install confirmed, backup created, restore confirmed, update install accepted, etc.) into the same log stream as the Rust side. Without this, the View Logs modal can only show half the story.
- [ ] **View Logs modal in Settings Utilities row**: once the logging coverage above is in place, add a "View Logs" utility card that tails recent entries from `tauri-plugin-log`. Should support filtering by level (info/warn/error), a copy-to-clipboard button for the visible buffer, and a "Open log file" shortcut that reveals the on-disk log in the OS file manager. Pairs well with the existing Diagnostics card for bug-report workflows. Skip until the coverage audit + frontend bridge are done — currently too little is logged for a dedicated viewer to be useful.
- [ ] **Cross-platform smoke test (macOS + Linux)**: full end-to-end pass on each platform once macOS hardware is available — not just the auto-updater, but the whole app surface. Verify build + install + first-run bundled-overlay extraction, Tuna connection + now-playing data flow, overlay editor save/reset/preview, font install/delete, store install + delete, backup/restore round-trip, diagnostics output, and auto-update apply + post-update snapshot replay. Windows is the primary dev/test platform; macOS + Linux will reveal any path/case/permission/firewall assumptions baked into the install, server, or updater paths. Delayed indefinitely until macOS hardware is on hand for a real end-to-end test.

---------------------------------------------------------------------------------

## Long-term / Stretch Goals
- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Hosted on GitHub Pages as a metadata-only catalog — see STORE.md for full implementation plan.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
