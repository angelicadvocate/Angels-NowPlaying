# CHANGELOG

All notable changes to this project will be documented in this file.

Entries are in reverse chronological order (newest at top).
Only completed and released work goes in this file.

Please be sure to add date, completed tag, `github:[username]`, and version number change if needed
(see below for formatting example)


---------------------------------------------------------------------------------

## v0.10.3 – 2026-04-29

* [x] **Header buttons (GitHub / Tip / Social) now work on every page** 🐛 *FIXED* `github:AngelicAdvocate`
  * The GitHub, Buy Me a Coffee, and Twitter/Facebook/Reddit/Discord share buttons in the header were dead on the Settings, Store, and Instructions pages. Two compounding causes: (1) Tauri's webview ignores both `<a target="_blank">` navigations and `window.open(..., '_blank')` calls — neither routes to the system browser without an explicit `invoke('open_url')`, and (2) only `index.html` had its own `shareTo*` helpers + a `DOMContentLoaded` delegation handler that intercepted every `target="_blank"` click; the other pages either didn't load `tauri.js` at all (Store, Instructions) or used raw `window.open` for their share buttons (Settings)
  * Consolidated the share helpers (`shareToTwitter`, `shareOnFacebook`, `shareToReddit`, `shareToDiscord`) and the external-link click delegation into `src/js/tauri.js`, so any page that loads the Tauri bridge gets working header buttons automatically. Added the `tauri.js` import to Store and Instructions, and removed the duplicated/broken inline copies from all four pages

* [x] **Update-available toast on app launch** ✨ *COMPLETED* `github:AngelicAdvocate`
  * The index page now silently calls the updater plugin on load and, when a newer version is published, surfaces a top-right toast ("Update available — v0.10.3 → v0.10.4") with an **Open Settings** action that jumps straight to the Check for Updates card. Network errors / offline states are swallowed silently — the user only learns about updates if there's actually one to install
  * Toast styling is keyed off the existing theme variables so it picks up dark/light mode automatically, and uses a dedicated `#launch-toasts` container so future toasts (export complete, restore failed, etc.) can stack into the same slot without restyling

* [x] **"Customizations restored" success toast after auto-updates** ✨ *COMPLETED* `github:AngelicAdvocate`
  * When `consume_pending_restore_if_armed()` succeeds during post-update startup it now writes a `.snapshots/restore-success.txt` one-shot marker. The new `consume_restore_success_flag` Tauri command is called by the index page on first paint after relaunch — if armed, it shows a green success toast ("Customizations restored — your overlay tweaks and settings carried over from the previous version") and clears the marker so it never re-fires on subsequent launches. Failed restores never set the flag, so the toast can only ever indicate genuine success
  * Replaces the long-promised but never-shipped "bundled overlay customizations were reset to defaults" warning toast — now that the snapshot/restore wrap is live, that message would have been incorrect on every update

---------------------------------------------------------------------------------

## v0.10.2 – 2026-04-29

* [x] **Diagnostics: real OS name + version** 🐛 *FIXED* `github:AngelicAdvocate`
  * The OS row in Settings → Diagnostics was rendering as `windows windows` because it concatenated `std::env::consts::OS` with `std::env::consts::FAMILY` — both of which return the platform family on Windows with no version info. Reports now use the `os_info` crate, which reads the registry on Windows, parses `/etc/os-release` on Linux, and shells `sw_vers` on macOS, producing strings like `Windows 11 (22631)`, `Ubuntu 22.04`, or `Mac OS 14.4` — actually useful for bug reports
  * The lower `Family` row is unchanged (still `windows` / `unix`) since that's a meaningful separate field for cross-platform troubleshooting

* [x] **Update-status message no longer pushes Settings page taller** 🐛 *FIXED* `github:AngelicAdvocate`
  * The `#update-status` paragraph below the **Check for Updates** button used to start at `display: none` and switch to `display: block` once a status message appeared, which made the entire Settings card grow vertically the moment the user clicked the button. The element is now always present, empty by default, and `flex-grow: 1` so it consumes the existing whitespace below the button — status messages render in place with zero layout shift

---------------------------------------------------------------------------------

## v0.10.1 – 2026-04-29

* [x] **Snapshot / restore around auto-updates** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Settings → Check for Updates now takes a silent pre-update snapshot via `create_backup(None)` (writing to `AppData/AngelsNowPlaying/.snapshots/update-<unix>.zip`) and arms a `pending-restore.txt` marker via the new `arm_pending_restore` command before calling `downloadAndInstall()`. On the post-update relaunch, `consume_pending_restore_if_armed()` runs in `setup()` after `extract_bundled_overlays`, replays the snapshot through the existing `restore_backup` pipeline, and removes the marker — so bundled-overlay customizations and app/overlay settings carry across version jumps without the user touching anything
  * Marker is removed before the restore runs, so a corrupt snapshot or a partial restore can never trap the user in a startup loop. Restore failures are logged via `tauri-plugin-log` instead of blocking app launch
  * If the snapshot itself fails (disk full, AV interference, etc.) the user is shown the underlying error and asked whether to install the update unprotected — never silent
  * Added `prune_snapshots(keep)` (auto-called with `keep=5` after every silent snapshot) so `.snapshots/` can't grow unbounded across many updates. Newest 5 snapshots are kept by mtime; older ones are deleted best-effort

---------------------------------------------------------------------------------

## v0.10.0 – 2026-04-29

* [x] **Auto-Updater wired up (Phase 1)** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Added `tauri-plugin-updater` and `tauri-plugin-process` to `src-tauri/Cargo.toml`, plus the matching `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` JS packages. Both plugins are registered in `lib.rs` and surfaced through `src/js/tauri.js` as `window.__TAURI__.updater.check()` and `window.__TAURI__.process.relaunch()` so existing `settings.html` style call sites can use them without becoming module scripts
  * `tauri.conf.json` now sets `bundle.createUpdaterArtifacts: true` and declares `plugins.updater` with the GitHub Releases endpoint `https://github.com/angelicadvocate/Angels-NowPlaying/releases/latest/download/latest.json` plus the project's ed25519 public key baked in
  * `capabilities/default.json` now grants `updater:default` and `process:default` so the frontend can actually invoke the plugin commands
  * Settings → Check for Updates is no longer a 1-second `setTimeout` mock — it calls the real `check()` API, shows a side-by-side "Current → Latest" version row when an update is found, prompts the user with the release notes from `latest.json`, downloads the signed installer with a live byte-progress readout, applies it, and relaunches via the process plugin. Failures show the underlying error message instead of silently succeeding
  * `.github/workflows/release.yml` now passes `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` from repo secrets into `tauri-action`, and sets `updaterJsonPreferNsis: true` so the manifest is uploaded as a release asset alongside each platform installer
  * Lays the groundwork for v1.0 — every tagged release now ships with a verifiable updater manifest and existing installs can self-update without a fresh download from the website

---------------------------------------------------------------------------------

## v0.9.9 – 2026-04-23

* [x] **Fix: editor Save could wipe `main.css` to a bare `:root` block on transient read failure** 🐛 *FIXED* `github:AngelicAdvocate`
  * Root cause in `editor-shell.js` save handler: an empty `catch {}` around the pre-write `read_file_abs` silently swallowed any read error and let `currentCSS` stay `""`. The follow-up ternary then used the new `:root` block by itself as the entire file contents and `save_file_abs` happily wrote that to disk — wiping every rule outside `:root` (animations, selectors, media queries, etc.)
  * Hard to reproduce because `read_file_abs` only fails intermittently — most likely culprits are Windows antivirus locks during a scan, OBS holding `main.css` open while reloading the Browser Source, or any concurrent file-system activity in the overlay folder. The empty catch made every one of those silent
  * The save handler now (a) re-throws on any read error with the failing path in the message, (b) refuses to save if `currentCSS` is empty or has no `:root` block, (c) validates that the overlay's returned `:root` block is well-formed before substituting, and (d) refuses any save whose result would shrink the file by more than half — a last-line guard that would have caught this exact bug regardless of the upstream cause

* [x] **Collision-safe overlay install ids** ✨ *COMPLETED* `github:AngelicAdvocate`
  * `install_overlay` in `backend.rs` no longer rejects installs that share a folder name with an existing user overlay. The first install of a given slug keeps its clean folder name (e.g. `frame-foo`); any later install of an unrelated overlay with the same slug is given an 8-char hex suffix from a fresh UUIDv4 (e.g. `frame-foo-a3f2c1d4`), and two unrelated overlays sharing a slug can now coexist
  * The on-disk folder name remains the routing key everywhere — `list_user_overlays` returns it as `_id`, and the frontend already uses `_id` for HTTP server URLs, editor URLs, delete, and CSS path lookup, so the suffix flows through with zero JS changes
  * Display name in the overlay grid still comes from `manifest.name`, so the suffix is invisible in the UI; users only see it in the Settings → Delete dropdown ("My Overlay (frame-foo-a3f2c1d4)") where the disambiguation is exactly what's wanted
  * Backwards compatible — existing user installs keep their plain folder names; only new collisions get suffixed. Backup/Restore round-trips suffixed folders correctly because the wipe+replace step copies whatever folder names are in the archive
  * Hard prerequisite for the upcoming community store: two unrelated authors can now publish overlays with the same slug without overwriting each other on install
  * Added `uuid = { version = "1", features = ["v4"] }` to `src-tauri/Cargo.toml`

* [x] **Rename editor "Copy URL" → "Copy Path"** ✨ *COMPLETED* `github:AngelicAdvocate`
  * The editor header button hands OBS a local `file://` path, not a URL — renamed the visible label and tooltip in `editor-shell.html` to match reality, and updated the companion comment in `editor-shell.js`. Button id `copy-url-btn` kept internal so the rename is a pure string change with no behavioural impact
  * Updated `instructions.html` section ("Copying the OBS source URL" → "Copying the overlay file path"), `README.md` quick-start step, `DEVELOPMENT.md`, `FRAME-DEVELOPMENT.md`, and the `frame-template-starter` README so all developer + user-facing docs reference the new name

* [x] **Backup & Restore** ✨ *COMPLETED* `github:AngelicAdvocate`
  * **Backup** card in Settings → Utilities now creates a single portable zip at a user-chosen destination. Archive contents: `backup-info.json` metadata, full recursive copies of `user-overlays/` and `fonts/user/`, the two settings files (`settings.json`, `overlay-settings.json` — only if they exist on disk), and `bundled-customizations.json` (overlay-id → `:root` var overrides diffed against each overlay's `manifest.json.defaults`, so only actually-customized values ship in the backup)
  * **Restore** card reads a backup zip, validates `backup_format_version`, extracts to a temp staging dir, wipes + replaces user overlays / user fonts, regenerates `user-fonts.css`, routes app + overlay settings through the existing `save_settings` / `save_overlay_settings` commands (so the `tuna-port.js` regeneration side effect still runs), and merges each bundled customization into the overlay's *current* `:root` block. This makes restore forward-compatible with overlay updates — new vars added in a future version keep their new defaults, and vars that were removed from an overlay are silently dropped
  * **Machine-portable app settings**: on restore, `tuna_path` and `export_root` are validated via `Path::exists()` on the target machine. If the backup's path doesn't exist locally, the current machine's value is kept and the user sees a warning in the restore summary — so backups are safe to carry between PCs without breaking paths
  * Post-restore summary modal reports counts, lists any bundled overlays skipped (because they no longer exist in this app version), and surfaces per-field warnings (e.g. malformed settings entries, missing Tuna path, `user-fonts.css` regeneration failures)
  * Backend commands: `create_backup(destination: Option<String>)` and `restore_backup(source: String)`. The `Option<String>` destination is the hook for the planned auto-updater — passing `None` writes a silent snapshot to `AppData/AngelsNowPlaying/.snapshots/update-<unix>.zip`. The backup walker explicitly skips any folder starting with `.`, so snapshots can never recursively include themselves
  * **Licenses deliberately not tracked**: the store will be a metadata-only catalog and paid 3rd-party overlays manage their own licensing — the app does not back up or restore license keys. A user-facing note will live on the store site (tracked in STORE.md)

* [x] **Bundled fonts as a real app resource** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Curated 10 open-license families (16 TTFs: Regular + Bold for Arimo, Comic Relief, Courier Prime, Gelasio, Montserrat, Tinos; Regular only for Fascinate Inline, Mogra, Playwrite Norge, Sekuya) shipped under `src/fonts/` with per-family license files
  * Added `src/fonts/fonts.css` with `@font-face` declarations for every bundled family
  * Backend: new `fonts_dir()` helper, `/fonts/<path>` HTTP route (with dev fallback to `src/fonts/`), and bundled-font extraction in `extract_bundled_overlays()`
  * Build wiring: `vite.config.js` copies `src/fonts/` → `dist/fonts/`; `tauri.conf.json` exposes `../dist/fonts` as a resource — fonts now load identically in dev, the in-app preview, the local HTTP server, and OBS `file://` browser sources across all platforms, with no internet dependency
  * All 12 overlays updated: `main.html` and `editor.html` link `../../fonts/fonts.css`; each editor's font dropdown rebuilt with 16 alphabetized bundled entries; `main.css` + `manifest.json` defaults set (Montserrat Regular for 11 overlays, Courier Prime Regular for `frame-cassette-tape`)
  * Renamed `Playwrite NO` → `Playwrite Norge` (folder, TTF, and all CSS / editor / docs references) for clearer naming
  * `LICENSES.md`: new bundled fonts attribution table; `FRAME-DEVELOPMENT.md`: new **3b. Bundled fonts** section documenting the `fonts.css` link and the full availability matrix

* [x] **Overlay version in editor header** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Added `#page-version` span to `editor-shell.html` below the overlay title; `editor-shell.js` reads the overlay's `manifest.json` version during init and renders it as `v<version>`
  * `editor-header.css` updated with column flex layout + muted version styling so users can compare their installed overlay version against future store listings

* [x] **Settings → Manage Fonts UI** ✨ *COMPLETED* `github:AngelicAdvocate`
  * New **Manage Fonts** button in Overlay Management opens a `#fontsModal` with an install row, a Custom Fonts list (Aa preview, family name, filename, size, delete) and a read-only Bundled Fonts list (Aa preview + license tag linking to `LICENSES.md`)
  * Backend commands `list_bundled_fonts`, `list_user_fonts`, `install_font`, `delete_user_font` back the modal; installed fonts land in `AppData/AngelsNowPlaying/fonts/user/` and are preserved across app updates (the bundled-font extraction step skips the `user/` subfolder)
  * `user-fonts.css` is regenerated on every install/remove with auto-detected format for `.ttf`, `.otf`, `.woff`, `.woff2`; `fonts.css` `@import`s it so custom fonts are available everywhere bundled fonts are
  * `src/fonts/font-augment.js` runs inside each editor iframe and, on the shell's `init` message (now carrying `userFonts`), appends a `── Custom Fonts ──` separator plus one `<option>` per user font to the editor's font dropdown — all 12 overlays updated, no per-overlay wiring required
  * `FRAME-DEVELOPMENT.md` **3b. Bundled fonts** section extended with the `font-augment.js` snippet and the `<select>` id / option-value contract so community overlay authors get the same behavior for free

* [x] **Settings page layout polish** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Overlay Management columns now stretch to a shared height; primary actions (Save Settings, View Instructions, Manage Fonts) pin to the bottom of their cards via `margin-top: auto` so the two columns line up cleanly
  * Mobile breakpoint (`max-width: 1400px`): added inter-section spacing with a top border + padding between stacked `.overlay-section` blocks for breathing room when the columns collapse

* [x] **Reset App Data + uninstaller data-preservation notice** ✨ *COMPLETED* `github:AngelicAdvocate`
  * New **Utilities** row in Settings (5-card grid, ready for future single-action utilities) with a **Reset App Data** card. Red "Reset…" button opens a confirmation modal that requires typing `RESET`, then wipes `AppData/AngelsNowPlaying/` (overlays, fonts, settings, bundle-version stamp) and exits the app for a clean relaunch
  * New `reset_app_data` Tauri command iterates `app_data_dir()` and removes every child; new `exit_app` command calls `app_handle.exit(0)` so the app relaunches into first-run bootstrap (re-extracting bundled overlays and fonts)
  * New NSIS installer hook (`src-tauri/windows/hooks.nsh`, wired via `bundle.windows.nsis.installerHooks`): when the user ticks the "Delete the application data" checkbox during Windows uninstall, a `NSIS_HOOK_POSTUNINSTALL` message box informs the user that their overlay library (including any paid overlays from the future store) was preserved on purpose, shows the exact `%APPDATA%\Roaming\AngelsNowPlaying` path, and warns that manual deletion is permanent. Suppressed in silent/passive installs.
  * Cross-platform by design: macOS and Linux have no uninstaller UX to hook into, but the Settings button offers identical cleanup on those platforms. Paid overlays from the planned community store cannot be destroyed by a single misclick during uninstall

* [x] **Settings Utilities row restructure + Diagnostics card** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Flattened the Utilities row into 5 standalone cards in a single grid — no wrapping heading card — laid out left → right: **Manage Fonts**, **Backup**, **Restore**, **Diagnostics**, **Reset App Data** (danger-zone action pinned to the rightmost slot)
  * **Manage Fonts** moved out of the Overlay Management column stack into its own utility card so it reads as a top-level app action rather than an overlay sub-setting
  * **Backup** and **Restore** cards added as placeholders with a shared "Coming Soon" modal; wires the UI for the planned config export/import system without shipping backend work yet
  * New **Diagnostics / System Info** card: opens a read-only monospace report of app version, build mode, OS / architecture / family, WebView version, all resolved paths (executable, app-data dir, settings, bundled overlays, user overlays, fonts dir, user fonts dir), runtime state (overlay server port, Tuna port, `allow_remote`, bundle-version stamp), and counts of bundled / user overlays and fonts. Ships with "Copy as Markdown" and "Copy as JSON" buttons for pasting into GitHub issues
  * **PII-safe path redaction**: the backend `get_diagnostics` command runs every path through a `redact_path()` helper that replaces the user's home directory with a platform-neutral placeholder — `%USERPROFILE%` on Windows, `$HOME` on macOS/Linux — so reports are safe to share publicly but remain pasteable into a shell (which will re-expand the placeholder for the reporter)

---------------------------------------------------------------------------------

## v0.9.8 – 2026-04-19

* [x] **Reset to Defaults button** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Added `"defaults"` key to all 12 overlay `manifest.json` files containing canonical `:root` CSS var values
  * Added `reset-to-defaults` postMessage handler to all 12 `editor.html` files; calls `populateSlidersFromVars` then `sendAllVars` on receipt
  * Added Reset button to `editor-shell.html` (between Copy URL and Save); shell reads `manifest.json` at click time, extracts defaults, and sends `{ type: 'reset-to-defaults', defaults }` to the iframe
  * Fixed missing `else` branch in `populateSlidersFromVars` for `--auto-rotate-hue` in `frame-cassette-tape` and `frame-program-window` — sliders now correctly restore to visible state when hue auto-rotate resets to `no`

* [x] **frame-program-window: Frame Style dropdown** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Added `--frame-variant` CSS var (values 0–4) to `main.css`, `manifest.json` defaults, and `editor.html`
  * Editor shows a "Frame Style" select (Style 1–5 mapping to variants 0–4) wired into `populateSlidersFromVars`, `sendAllVars`, and `buildRootBlock`
  * `common.js` swaps `#frame-image` src when `--frame-variant` changes in both edit mode (`setCSSVar` handler) and OBS mode (`$(document).ready`)

* [x] **frame-program-window: Text rendering fixes** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Fixed "Now Playing" custom text clipping: changed `#now-playing-container` from `overflow: hidden` to `overflow: visible` so negative `margin-top` values no longer clip text above the container boundary
  * Increased `#content` right padding from `40px` to `45px` to prevent song title overflowing the frame artwork edge

* [x] **frame-cassette-tape: Simplified text rendering** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Removed character-based truncation system (`ARTIST_MAX_CHARS`, `SONG_SHORT_MAX`, `SONG_LONG_MAX`, `truncateText`, `applySongMode`, `#song.song-long`)
  * Wrapped `#artist` and `#song` in individual `.text-clip` divs; clip width (`490px`) is the sole truncation control — text clips at the container edge with CSS ellipsis
  * Scrolling disabled via `--scroll-extra: 9999px`; changing the clip width in `.text-clip` is all that is needed to adjust the visible text area

* [x] **Store page: Coming Soon image** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Replaced plain `<div class="coming-soon">Coming Soon</div>` text with `<img src="/assets/coming-soon.png" class="coming-soon-img" />`
  * Updated `store.css` to size the image responsively (`min(600px, 90%)`, shrinks to `min(420px, 90%)` on narrow viewports)

---------------------------------------------------------------------------------

## v0.9.5, v0.9.6, v0.9.7 – 2026-04-18

* [x] **Editor-shell architecture + HTTP server for bundled overlays** ✨ *COMPLETED* `github:AngelicAdvocate`

  **Editor-shell**
  * Introduced `editor-shell.html` / `editor-shell.js` as a single shared host for all overlay editors, replacing per-overlay Vite-bundled entry pages
  * Editor header (nav, Save, Copy URL, Back) lives in the shell; each overlay's `editor.html` is loaded inside a child `<iframe id="overlay-frame">` and communicates via `postMessage`
  * New `get_overlay_editor_url` Tauri command returns the correct HTTP URL for both bundled and user-installed overlays
  * `overlays.js` updated to construct `editorUrl` using the shell + overlay ID query parameter
  * All 12 overlay `editor.html` files cleaned: removed legacy header HTML, adopted `postMessage` protocol (`init`, `request-root-block`, `root-block` message types)
  * Dead code removed from `backend.rs` and `lib.rs`: `EDITOR_HEADER_HTML`, `THEME_CSS`, `get_editor_header_html` command, and `install_overlay` post-processing strip block

  **Bundled overlays served via HTTP server**
  * `extract_bundled_overlays()` in `backend.rs` updated to serve bundled overlay files through the existing HTTP server, bringing them in line with user-installed overlays
  * Eliminates `tauri://localhost` cross-origin restrictions that previously required inline CSS/script injection on install

  **Editor init performance fix**
  * Fixed 60+ second editor load delay caused by the shell's `load` event waiting on nested `.webm` video files inside the preview iframe
  * Each `editor.html` now posts `{ type: 'frame-ready' }` immediately when its script runs; `editor-shell.js` uses this to trigger `onFrameLoad()` without waiting for media resources
  * `load` event kept as a `{ once: true }` fallback for safety

  **Editor bug fixes**
  * **frame-cassette-tape**: `applyTapeStyle()` was only called in edit mode; fixed by reading `--tape-style` CSS var at startup in the OBS path (`common.js`)
  * **frame-program-window**: `--auto-rotate-hue` was never saved in `buildRootBlock` and `common.js` had no hue-rotation logic in the OBS path; both fixed
  * **Hue rotation UI (neon-lights, color-bar-visualizer, cassette-tape)**: added "Disable hue rotation to set hue color manually." message div that replaces the hue slider when auto-rotate is active, matching the existing `frame-program-window` pattern; also fixed `--auto-rotate-hue` save/restore for `frame-cassette-tape`
  * **Editor header spacing**: `editor-shell.html` lacked body padding, causing a visible layout jump vs. other app pages; fixed with explicit `padding-left/right: 4rem` on `.header-container`

  **CI/CD**
  * Updated GitHub Actions workflow: `actions/checkout` → `@v5`, `actions/setup-node` → `@v5` (Node.js 24)

---------------------------------------------------------------------------------

## v0.9.1, v0.9.2, v0.9.3, v0.9.4 – 2026-04-12

* [x] **Stability improvements for standalone app builds**
* [x] **Initial CI/CD pipeline implemented (GitHub Actions)**  
  Established a release pipeline that builds Windows (`.msi`), macOS (`.dmg`), and Linux (`.AppImage`) artifacts automatically for tagged releases.

* [x] **Additional fixes and improvements**
  - [x] **Resolved missing jQuery in OBS for bundled overlays**: ensured `jquery-3.5.1.min.js` is extracted to the correct AppData path during `extract_bundled_overlays()`, restoring proper script loading.
  - [x] **Fixed broken header images in bundled overlay editors**: updated asset handling so mascot and logo images load correctly from disk within AppData, removing the need for base64 inlining.
  - [x] **Corrected hue-rotation persistence issue**: saving and reloading overlays now properly preserves the CSS hue-rotation setting.
  - [x] **Refactored editor CSS structure**: consolidated shared header styles into a common stylesheet and removed redundant header styling from individual overlay `editor.css` files, ensuring clearer separation of responsibilities.

---------------------------------------------------------------------------------

## v0.9.0 – 2026-04-11

* [x] **User overlay install flow end-to-end + full editor compatibility** ✨ *COMPLETED* `github:AngelicAdvocate`

  **User overlay HTTP server**
  * Added a dedicated `start_user_overlay_server()` that binds to `127.0.0.1:0` (OS-assigned port) at app startup, serving static files from `%APPDATA%/AngelsNowPlaying/overlays/`
  * New `get_user_overlay_server_port` Tauri command exposes the port to JS
  * Virtual route serves embedded jQuery bytes at `js/vendor/jquery-3.5.1.min.js` so overlay `main.html` files resolve their script reference correctly
  * Query-string stripping (`?edit=1`) added to server file lookup so `main.html?edit=1` correctly opens `main.html`
  * `overlays.js` now builds `editorUrl` and `previewUrl` for user overlays using `http://127.0.0.1:{port}/{id}/...` instead of `file://` URLs, avoiding WebView2's cross-origin restriction that blocked loading from `tauri://localhost`
  * `index-page.js` handles null `editorUrl` gracefully (renders disabled button instead of broken anchor)

  **`install_overlay()` post-processing**
  * On install, `editor.html` is post-processed: all `../../css/` link tags replaced with inline `<style>` blocks, all `../../js/` script tags replaced with inline `<script>` blocks
  * App CSS (`editor-header.css`, `editor-common.css`, `theme.css`) and scripts (`tauri.js` shim, `editor-header-loader.js`) embedded in the Rust binary via `include_str!` / `include_bytes!`
  * `base64 = "0.22"` added to `Cargo.toml`
  * New `get_editor_header_html` Tauri command returns the editor header HTML with CSS inlined and images converted to base64 data URIs — used by user overlay editors (HTTP origin) where `fetch()` of a `tauri://localhost` URL is blocked
  * `TAURI_SHIM_JS` constant provides a self-contained replacement for `tauri.js` using `window.__TAURI_INTERNALS__.invoke()` (the correct Tauri v2 IPC API)
  * Zip entry names normalised from backslashes to forward slashes so `Compress-Archive`-generated zips (Windows PowerShell) install correctly

  **`editor-header-loader.js` consolidation**
  * All 12 overlay editors updated: removed per-editor `parseCSSVars`, `CSS_PATH`, `readMainCSS`, `window.onSave`, `window.onBack` implementations
  * Each editor now exposes `window.buildRootBlock(vars)` and listens for the `headerLoaded` CustomEvent to initialise controls from saved CSS values
  * `editor-header-loader.js` is now the single owner of Save, Copy URL, and Back button behaviour
  * Protocol detection: uses `get_editor_header_html` Tauri command for non-`tauri:` origins (HTTP server); falls back to `fetch()` for bundled overlays on `tauri://localhost`
  * `extractOverlayId()` regex updated to match both `/overlays/{id}/editor.html` (bundled) and `/{id}/editor.html` (user overlay HTTP server)
  * Back button: `history.back()` for non-`tauri:` origins; `window.location.href = '../../index.html'` for `tauri:` origin
  * Fixed missing `</script>` closing tag in `frame-template-starter/editor.html`

  **Editor header HTML fix**
  * Home button changed from `<a href="../../index.html"><button>` to `<button id="back-btn">` so `editor-header-loader.js` can wire it up correctly — the anchor was navigating to `http://127.0.0.1:{port}/index.html` (404) instead of returning to the app home page

  **Navigation commands**
  * New `navigate_home` Tauri command (uses `history.back()` eval) — preserved for potential future use
  * `get_overlay_main_path` now falls back to user overlays AppData dir if not found in bundled paths, so Copy URL returns the correct AppData path for user-installed overlays
  * `use tauri::Manager` added to `backend.rs`

  **Light mode**
  * Full light/dark theme implemented across all app CSS files (`index.css`, `settings.css`, `store.css`, `instructions.css`, `editor-common.css`, `editor-header.css`) using CSS custom properties
  * New `src/css/theme.css` defines `--bg-primary`, `--bg-card`, `--text-primary`, `--border-color`, `--input-bg` etc. for both `[data-theme="dark"]` and `[data-theme="light"]`
  * `applyDarkMode()` updated across all pages to set `document.documentElement.dataset.theme`
  * Theme applied before first paint on every page to eliminate flash of dark content

  **Documentation**
  * `DEVELOPMENT.md`: command table fully updated, editor section rewritten to document `window.buildRootBlock` / `headerLoaded` contract, stale "Roll out iframe editor pattern" removed from contributing section
  * `FRAME-DEVELOPMENT.md`: install workflow updated (zip format, `Compress-Archive`, delete → edit → reinstall iteration loop), Further Reading updated
  * `frame-template-starter/README.md`: editor controls section rewritten for new `window.buildRootBlock` / `headerLoaded` pattern

---------------------------------------------------------------------------------

## v0.8.2 – 2026-04-05

* [x] **Flatten `src/` directory structure** ✨ *COMPLETED* `github:AngelicAdvocate`
  * Moved `src/main_pages/{settings,store,instructions}.html` → `src/html`
  * Moved `src/main_pages/index.html` → `src/` directly
  * Moved `src/editor_pages/editor-header.html` → `src/html/editor-header.html`
  * Moved `src/css/main_pages/*.css` → `src/css/` directly
  * Moved `src/css/editor_pages/{editor-common,editor-header}.css` → `src/css/`
  * Removed the old redirect `src/index.html`; the real home page is now the Vite root entry
  * Updated all internal path references: 4 main HTML pages, 12 overlay `editor.html` files, `editor-header-loader.js`, and `vite.config.js` rollup inputs
  * Removed empty `src/main_pages/`, `src/editor_pages/`, `src/css/main_pages/`, `src/css/editor_pages/` folders
  * Updated `DEVELOPMENT.md` project structure section to reflect new layout

---------------------------------------------------------------------------------

## v0.8.1 – 2026-04-04

* [x] **iframe editor migration for all 11 bundled overlays + full OBS QA pass** ✨ *COMPLETED* `github:AngelicAdvocate`

  **Editor iframe migration**
  * Migrated all 11 bundled overlay editors to the iframe preview pattern established in `frame-template-starter`: `<iframe src="main.html?edit=1">` replaces the old inline `#sample` div; `sendVar()` / `postMessage` replaces direct DOM manipulation in every `editor.html`
  * Each editor now uses `parseCSSVars` + `populateSlidersFromVars` to load saved values from `main.css` on open, and `buildRootBlock` + `onSave` to write them back
  * `editor.css` updated in every overlay to size and scale the iframe preview correctly at `transform: scale(S); transform-origin: top left` with compensating negative margins
  * Overlays migrated: `frame-banner-visualizer`, `frame-cassette-tape`, `frame-color-bar-visualizer`, `frame-glassmorphism-1`, `frame-glassmorphism-2`, `frame-horizontal-classic`, `frame-horizontal-wide`, `frame-neon-lights`, `frame-program-window`, `frame-retro-vinyl`, `frame-vertical-panel`

  **Pre-ship OBS + editor QA**
  * All 11 overlays tested with Tuna running and a real song playing
  * Phase 1 (default overlay in OBS): album art, title/artist, progress bar, and marquee scroll verified on each
  * Phase 2 (edit → save → reload OBS): at least one visual property changed and confirmed matching between editor preview and OBS output on each overlay

---------------------------------------------------------------------------------

## v0.8.0 – 2026-04-03

* [x] **Overlay management, documentation overhaul, settings page, and editor improvements** ✨ *COMPLETED* `github:AngelicAdvocate`

  **Overlay management (Settings page)**
  * Added full-width **Overlay Management** card to Settings spanning all three grid columns with a horizontal sub-grid layout that reflows on narrow viewports
  * Install overlay from zip: native file picker → validates zip structure (single top-level folder, `manifest.json` required, zip-slip guard) → extracts to `%APPDATA%/AngelsNowPlaying/overlays/`
  * Delete user overlay: dropdown populated from `list_user_overlays`, confirmation before removal, AppData-only guard (bundled overlays cannot be deleted)
  * Download starter template: zips `frame-template-starter` to a temp file, opens native save dialog, moves to user-chosen location
  * Show/hide user-installed overlays toggle (default on) — persisted to `settings.json`
  * Show/hide developer template starter toggle (default off) — persisted to `settings.json`; `frame-template-starter` hidden from home page by default
  * `listAllOverlays()` in `src/js/overlays.js` now reads `get_overlay_settings` and filters `frame-template-starter` and user overlays based on the two new toggle values

  **Rust backend additions (`backend.rs` / `lib.rs`)**
  * `OverlaySettings` struct gains `show_user_overlays: bool` (default `true`) and `show_template_starter: bool` (default `false`); `get_overlay_settings` / `save_overlay_settings` updated accordingly
  * New commands: `install_overlay`, `delete_user_overlay`, `zip_overlay`, `pick_save_file`, `move_file`
  * Added `zip = "2"` (deflate feature) to `Cargo.toml`

  **Overlay flash fix**
  * Replaced DOM `.innerHTML` comparison in `common.js` with `lastDisplayedSong` / `lastDisplayedArtist` string variables — prevents overlay flashing every poll cycle when track titles contain HTML-special characters

  **Settings migration: `tuna-config.json` → `settings.json`**
  * Merged `tuna_port` and `dark_mode` into unified `src/overlays/settings.json`; removed file-based browse buttons for `Song.json` / `Artwork.png`
  * All overlay `common.js` copies read `../settings.json` at startup; `settings.html` loads / saves via `get_overlay_settings` / `save_overlay_settings` Tauri commands
  * Dark mode toggle auto-saves immediately on click; `.gitignore` updated from `tuna-config.json` → `settings.json`

  **Developer template starter (`src/overlays/frame-template-starter`)**
  * Full inline comment pass on `common.js`: all debug comments removed; section headers and developer-facing docs added for every DOM ID, the scroller, polling loop, progress bar, `loadTunaConfig()`, and `?edit=1` mode
  * `editor.html` comment blocks added: comprehensive block at `#header-root` documenting all three required pieces and the three `window` hooks; warning at loader `<script>` explaining why it must stay at end of `<body>`
  * `?edit=1` mode confirmed working inside Tauri WebView (Vite dev and OBS)

  **Documentation**
  * Rewrote root `README.md`: reflects current Tauri app architecture, removes all Song.json/Artwork.png file-based references, lists all Tuna-supported music sources (Spotify, Last.fm, YTMDA, VLC, WMP, MPD, etc.)
  * Created `LICENSES.md`: GPL-3.0 scope, independent-work clause (user overlays are not derivative works of the app), third-party component table (jQuery)
  * Renamed old `DEVELOPMENT.md` → `FRAME-DEVELOPMENT.md`; added easy in-app download method (Settings → Overlay Management → Download Starter Template) as the recommended first step for overlay developers
  * Created new `DEVELOPMENT.md` for main project contributors: prerequisites, build-from-source, project structure, Tauri command conventions, overlay discovery, contribution guidelines
  * Rewrote `instructions.html`: removed all file-based setup steps; new numbered sections cover app install, Tuna web server setup with all supported sources, port configuration, overlay customisation, and OBS Browser Source setup; added developer note section with GitHub link and links to both dev guides

  **`TODO.md` housekeeping**
  * Marked 6 previously completed items as done; added App UI — Light Mode section with full implementation breakdown; added Licensing section note

---------------------------------------------------------------------------------

## v0.7.1 – 2026-04-02

* [x] **Settings fixes, overlay documentation, and repo cleanup** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Fixed settings page version display: replaced broken `fetch('../../VERSION')` with `invoke('get_version')` Tauri command; version now loads correctly
  * Fixed `populateTemplateDropdown()` crash that was blocking the version display when `#template-select` element was absent from the DOM
  * Removed Template Management card from settings page (moved to future store page; original HTML preserved in git history)
  * Wrote `README.md` and `description.md` for all 11 bundled overlays (22 files total); `description.md` includes YAML frontmatter for future store page consumption
  * Removed stale planning notes (`notes/todo_list.md`, `notes/restructure-src-plan.md`, `notes/tauri-migration-plan.md`, `notes/v0.5.0-planning-app.md`) — completed or superseded
  * Removed empty `src/vendor/fontawesome/` folder (FontAwesome is CDN-loaded)
  * Consolidated `TODO.md`: added Store Page, App Distribution & Updates, Editor Enhancements, and Long-term Stretch Goals sections; migrated open items from old notes

---------------------------------------------------------------------------------

## v0.7.0 – 2026-04-01

* [x] **Vite integration, per-overlay restructure, Tuna configuration, and editor fixes** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Migrated frontend build to Vite 6 + `@tauri-apps/api` — resolves Tauri JS API availability issues under `file://`; all editor pages are now Vite entry points
  * Restructured all 11 overlays into self-contained per-overlay folders under `src/overlays/[name]/`, each with `main.html`, `editor.html`, `main.css`, `editor.css`, `common.js`, `manifest.json`, `preview.png`, and assets
  * Moved overlay-specific image/video assets from `src/assets/` into their respective overlay folders; shared assets (mascot, header-text, instructions image) remain in `src/assets/`
  * Fixed all broken asset paths after the restructure: `../../assets/` and `../static_assets/` references in `editor.css` (4 files) and `main.css` (4 files) updated to `./`
  * Copied `common.js` into all 11 overlay folders and removed the shared `src/js/common.js`; updated all `main.html` files to reference `./common.js`
  * Updated `vite.config.js` `copyOverlayStaticAssets` plugin to copy per-overlay `common.js` instead of the former shared copy
  * Fixed editor header across all 11 editors: mascot and header-text image paths, Home button routing, Share and Support button links, FontAwesome CDN loading on the main index page
  * Wired up the Save button in all 11 editors to call `save_css_file` Tauri backend command — CSS changes now write directly to the overlay folder without any manual copy/paste
  * Added Tuna Configuration section to settings page: Browse buttons (native file picker via `rfd`) for `Song.json` and `Artwork.png`, paths saved to `tuna-config.json` shared by all overlays
  * Added Rust backend commands: `get_version`, `get_tuna_config`, `save_tuna_config`, `pick_file`; added `rfd = "0.15"` dependency to `Cargo.toml`
  * Updated all 11 `common.js` copies to read `../tuna-config.json` at startup via `loadTunaConfig()` and use the configured paths for `Song.json` and `Artwork.png` polling
  * Downloaded real jQuery 3.5.1 to replace stub placeholder; added `src/js/vendor/jquery-3.5.1.min.js` and `src/overlays/tuna-config.json` to `.gitignore`; added `node_modules/` to `.gitignore` (was missing)
  * Added `manifest.json` for all 11 overlays describing metadata (id, name, version, author, tags, obsSize) consumed by the app index page

---------------------------------------------------------------------------------

## v0.6.1 – 2026-02-27

* [x] **Minor Tauri patch applied** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Fixed issue (that I created) where tauri would fail to load in pages by default leading in a 404
  * Pages now load, but editor interface is still incomplete/ has bugs. see TODO.md for planned resolution.

---------------------------------------------------------------------------------

## v0.6.0 – 2026-02-27

* [x] **Initial Tauri app skeleton added** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Added initial `src-tauri/` with `Cargo.toml`, `tauri.conf.json`, and `src/main.rs`
  * Added basic app settings UI / network server settings command footing
  * Not yet fully tested; initial migration step completed

---------------------------------------------------------------------------------

## v0.5.3 – 2025-12-14

* [x] **Polish Existing Layouts in Editor Pages** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Standardized layouts for F1, F2, F5, F6, and F7 to match F9, including moving the preview to the bottom (completed)
  * Adjusted control positioning on F3 and F8 to improve alignment and visual balance
  * Added an additional control to F1 (color picker) to better balance the layout
  * Updated and styled editor page header titles for improved consistency and readability
  * Added missing HTML templates for NowPlaying pages (F11, F10, F09, F06, F05)
  * Added missing CSS files for NowPlaying pages (F11, F10, F09)
  * Consolidated shared CSS selectors into editor-common.css
  * Unified and corrected HTML structure across similarly designed pages for clarity and consistency
  * Fine-tuned layouts to align updated HTML with existing CSS, with minor exceptions for unique pages
  * Applied various styling refinements across all editor pages
  * Planned potential restructure for src. (see restructure-src-plan.md)

---------------------------------------------------------------------------------

## v0.5.2 – 2025-12-13

* [x] **Finished F9 & F10 Editor / Created F5 & F6 Base** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Added the rest of the sliders to F10 Editor controls
  * Corrected drop shaddows on text and album art for F10
  * Generated new thumbnail for F10 Overlay
  * Created base for F5 Editor page
  * Created base for F6 Editor page
  * Unified the header module for the editor pages to match the layout used in the other pages.
  * Various tweaks to multiple eidtor pages.
  * Created editor-common.css for shared css values
  * Fixed scaling of frame on f9 editor page
  * Added additional controls to f1-f4 pages
  * Updated thumbnails for several overlay pages (still need to update f1 thumbnail)
  * Adjusted styling on controls, dropdowns, and color pickers to be consistent

---------------------------------------------------------------------------------

## v0.5.1 – 2025-12-12

* [x] **Created F9 Editor Base** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created base for F9 Editor page
  * Still needs to be implemented:

    * Thumbnail image correction for transparency (or)
    * Thumbnail image generation for light mode switch
  * Awaiting further testing
  * Future general editor page enhancement:

    * All pages need to be updated to use the same height for the dropdowns, color pickers, and sliders for better alignment

---------------------------------------------------------------------------------

## v0.5.1 – 2025-12-09

* [x] **Created F10 Editor Base** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created base for F10 Editor page
  * Still needs to be implemented:

    * Font picker
    * Rearrange sliders to balance columns
    * Text position up/down
    * Progress bar position up down
  * Awaiting further testing

---------------------------------------------------------------------------------

## v0.5.1 – 2025-12-08

* [x] **Header Module Implementation & Editor Layout Fixes** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created reusable header module with logo, back button, page title, copy URL, and save button (header.css)
  * Integrated header into F1, F2, F3, and F4 editor pages with proper save button callback functionality
  * Removed old bottom save buttons from F3 and F4 editors, moved save functionality to header save button
  * Fixed save button event handling - ensured header save button calls applyPreview() and downloadCSS() for CSS generation
  * Anchored header to top of page with flex-shrink: 0 to prevent layout collapse
  * Fixed layout gaps by removing justify-content centering from body flexbox and setting proper flex alignment
  * Removed excessive padding and margins from #site, #sample, #controls, and #editor-header elements
  * Set --editor-preview-padding-top to 0 to eliminate 140px vertical gap in F3 editor
  * Simplified body layout to use flex-direction: column with no centering to prevent space waste
  * Added global margin/padding resets to header elements to eliminate cascading spacing issues
  * Created F11 editor page with header module integrated
  * Standardized all editor pages to use consistent header styling and save functionality across F1-F4

---------------------------------------------------------------------------------

## v0.5.0 – 2025-12-07

* [x] **Settings Page UI Implementation & Header Standardization** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Built comprehensive settings.html page with dark mode toggle, template management, and about section
  * Added GitHub avatar to About card with dynamic URL and responsive sizing (144px desktop → 81px mobile)
  * Created reusable unified header template across settings, store, and instructions pages with support, share, and action buttons
  * Standardized header layout across all main pages with consistent padding, margins, and button spacing (no layout shift on navigation)
  * Integrated dynamic version loading from VERSION file to settings page for automatic version display updates
  * Implemented template management UI components (upload modal, delete dropdown) ready for Tauri backend integration
  * Added check for updates button and status display framework for future update notification system
  * Created reusable header component for individual overlay template editors (F7 editor as reference implementation)
  * Built F7 cassette tape overlay template with visual editor controls and generated CSS output
  * Created store.html base page with unified header and "Coming Soon" placeholder ready for future store embedded iframe
  * Standardized page formatting and styling across dashboard, editors, and main pages with responsive media queries
  * Added welcome card to 00-TemplateEditor.html dashboard with instructions and project overview
  * Removed scrollbars globally across all pages using CSS methods compatible with OBS embedded Chromium
  * Made instructions page content-agnostic by removing conflicting global styles while preserving header design consistency
  * Restructured project directory layout for Tauri migration: moved main display pages to `src/main_pages/`, editor pages to `src/editor_pages/`, consolidated styles to `src/css/main_pages/` and `src/css/editor_pages/`, moved all assets to `src/assets/`, and JavaScript utilities to `src/js/`
  * Corrected all relative file paths after restructure: updated asset references from `static_assets/` to `../assets/`, editor links from `editor_assets/` to `../editor_pages/`, CSS links to point to new directory structure, and fixed HTML linking between pages

---------------------------------------------------------------------------------

## v0.4.2 – 2025-10-26

* [x] **Dashboard & Template Management Updates** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Added F8 preview image and updated description in 00-TemplateEditor.html
  * Removed cassette tape option, updated glassmorphism/cassette template order and descriptions
  * Ensured template cards and preview images reflect latest changes
  * Updated OBS dimensions and template metadata where needed

---------------------------------------------------------------------------------

## v0.4.2 – 2025-10-26

* [x] **OBS Display Page & Data Fetch Fixes (F8)** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created 08-NowPlaying-F8.html for OBS display, matching F8 editor output
  * Fixed JSON fetch logic to correctly display artist name and track name
  * Synced font-family, margin, and layout between editor and OBS page
  * Ensured drop shadow and accent color match editor defaults
  * Moved inline CSS to external file for maintainability

---------------------------------------------------------------------------------

## v0.4.2 – 2025-10-26

* [x] **F8 Vinyl Editor Implementation & Refactor** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created F8 vinyl editor structure with vinyl-only preview, removed cassette toggle and assets
  * Added slider controls for font size, accent color, vertical offset, and drop shadow
  * Refactored CSS generation to use a single scale variable for all elements (matches F1 approach)
  * Ensured all generated CSS and runtime CSS use the scale variable for maintainability
  * Improved centering, overflow handling, and visual accuracy in preview and output
  * Finalized font-family and margin consistency between editor and OBS display page
  * Added rotation effect to background image for vinyl preview
  * Reset album art opacity to full, improved drop shadow prominence

---------------------------------------------------------------------------------

## v0.4.1

* [x] **Added more template cards to dashboard** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Added new card for templates for frames 8-11
  * Added basic descriptions for future designs
  * Fixed scrolling bug on main TemplateEditor dashboard page

---------------------------------------------------------------------------------

## v0.4.0

* [x] **File naming standardization and workspace cleanup** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Renamed all editor files from `01-EditorV2-Frame1.html` format to clean `F1-Editor.html` format
  * Renamed all CSS files from `01-EditorV2-F1-Styles.css` to `F1-Editor.css` format
  * Updated all references in dashboard (`00-TemplateEditor.html`) to use new file names
  * Updated CSS links in all HTML editor files to match new naming convention
  * Separated inline CSS from `instructions.html` into external `instructions.css` file
  * Significantly improved workspace organization and maintainability

---------------------------------------------------------------------------------

## v0.3.4

* [x] **Add version tracking and metadata** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Created VERSION file with current version 0.3.4
  * Added project.json with comprehensive project metadata
  * Added version comments to main files for tracking

* [x] **Smoke-test F1–F4 frames** ✨ *COMPLETED* `github:AngelicAdvocate`

  * User confirmed F1–F4 tested and working in OBS
  * All frames display properly with current song data
  * Text scrolling and progress bars functional

* [x] **Polish js/common.js and clean debug logs** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Removed development debug statements
  * Cleaned up code comments and formatting
  * Finalized production-ready common JavaScript library

* [x] **Revert temporary debug values** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Removed `data-debug-scroller` usage from production code
  * Cleaned debug console output from `js/common.js`
  * Backup `js/common.js.bak` retained for reference

* [x] **Fix F3 scroller slowdown** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Rewrote scroller to use transform + requestAnimationFrame
  * Updated reveal logic to improve performance
  * Eliminated sluggish animation behavior

* [x] **Normalize F2 runtime HTML** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Updated F2 to use `.text-clip` class for consistency
  * Ensures compatibility with shared JS scroller logic

---------------------------------------------------------------------------------

## v0.3.0

* [x] **Create Editor** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Creation of Editor Pages for use with the 4 Frames

---------------------------------------------------------------------------------

## v0.2.0

* [x] **Create Base Pages** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Creation of F2, F3, and F4 for use within OBS

---------------------------------------------------------------------------------

## v0.1.0

* [x] **First Frame** ✨ *COMPLETED* `github:AngelicAdvocate`

  * Initial single creation of F1 frame for use within OBS
