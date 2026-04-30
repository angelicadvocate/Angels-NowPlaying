
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

## Optional "Serve Overlays over HTTP" Feature (Next workstream — targeted for v0.10.5)

Repurposes the existing `start_server` / `stop_server` / `serve_port` / `export_root` / `allow_remote` plumbing (kept around in v0.10.4 specifically for this) into a real, user-facing optional feature. Default OFF — most users will never need it. Primary use cases: third-party / store overlays that hit `fetch()` or have CORS-bound assets and need a real served origin instead of `file://`, plus users who run OBS on a different machine on their LAN.

**1. Settings UI rewrite + new modal**
- [ ] **Rewrite the existing Settings card layout**: the current iteration has a lot of wasted vertical space — tighten it up so the new "HTTP Server" controls have somewhere to live without making the card sprawl. Goal is to fit the master toggle inline on an existing row, with all the detailed config behind a "Configure…" button that opens a modal.
- [ ] **New "Configure HTTP Server" modal** opened from the Settings card. Contents:
  - Master toggle: **Serve overlays over HTTP** (OFF by default)
  - Port input (number, default `8253` from existing `AppSettings.serve_port`, validate range 1024–65535, persist across launches so the OBS URL doesn't break)
  - Sub-toggle: **Allow access from other devices on my network** (OFF by default; only enabled when master toggle is ON)
  - Inline warning text shown when LAN sub-toggle is ON: *"⚠️ This opens your overlays to any device on your local network. Only enable this if you run OBS on a different machine. Your operating system may show a firewall prompt."*
  - Live status row: "Listening on `http://127.0.0.1:8253`" (loopback) / "Listening on `http://192.168.x.y:8253`" (LAN), or red error text if the port is already in use

**2. Backend: server lifecycle + bind logic**
- [ ] **Auto-start on app launch when master toggle is ON**, shut down on app exit. Hook into `setup()` in `lib.rs` after `start_user_overlay_server` so both servers come up together
- [ ] **Bind logic**: loopback-only (`127.0.0.1:<port>`) by default; bind `0.0.0.0:<port>` only when the LAN sub-toggle is explicitly ON
- [ ] **Port-in-use handling**: if the configured port is taken at startup, do NOT silently fall back to a random port (would break the user's saved OBS URL) — leave the server stopped, log the error, and surface a clear red error in the modal so the user can pick a different port
- [ ] **Static file serving**: serve `bundled_overlays_dir()` and `user_overlays_dir()` as static files. Reuse the existing `tiny_http` setup in `start_server` but rip out the legacy `export_root.join(url)` resolution and replace it with proper overlay-folder routing (`/<overlay_id>/main.html`, etc.) matching the existing user-overlay-server's path scheme
- [ ] **LAN IP detection**: when LAN mode is on, auto-detect the machine's primary LAN IP (likely via the `local_ip_address` crate, ~10 lines) so the editor's Copy URL button can produce `http://192.168.x.y:<port>/...` instead of `127.0.0.1`. On multi-NIC machines this picks one somewhat arbitrarily — add a footnote in the modal: *"If you have VPNs or multiple network adapters, verify the IP in your network settings."*

**3. Editor button rewire**
- [ ] **Editor header button swaps Copy Path ↔ Copy URL based on master toggle**: when HTTP-serve is OFF (default), button stays as **Copy Path** copying the local `file://` path (current behavior). When HTTP-serve is ON, button becomes **Copy URL** copying `http://127.0.0.1:<port>/<overlay_id>/main.html` (loopback) or `http://<lan-ip>:<port>/<overlay_id>/main.html` (LAN). Tooltip should reflect which mode is active

**4. Settings persistence + restore**
- [ ] Master toggle and LAN sub-toggle need new fields on `AppSettings` (e.g. `serve_overlays_enabled: bool`, `serve_lan: bool`). `serve_port` already exists; `allow_remote` will be renamed → `serve_lan` for clarity (or kept as an alias — decide during implementation). All four flow through `restore_backup` automatically since they're part of `AppSettings` serde

**5. Documentation**
- [ ] Brief blurb in the Instructions page explaining what the toggle does, when a user might want it (third-party / store overlays that need fetch / CORS), and the LAN security caveat

---------------------------------------------------------------------------------

## Long-term / Stretch Goals
- [ ] Build a community overlay "store" where users can browse, contribute, and install custom now playing overlays. Hosted on GitHub Pages as a metadata-only catalog — see STORE.md for full implementation plan.
- [ ] Keyboard shortcuts and accessibility improvements across the app UI.
- [ ] Consider per-overlay versioning: use the `version` field in each overlay's `manifest.json` to decide whether to re-extract that overlay on app update, instead of the current all-or-nothing `.bundle_version` stamp. Revisit alongside the auto-updater snapshot/restore work above — that's the prerequisite that makes this worth doing.
