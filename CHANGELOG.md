# CHANGELOG

All notable changes to this project will be documented in this file.

Entries are in reverse chronological order (newest at top).
Only completed and released work goes in this file.

Please be sure to add date, completed tag, `github:[username]`, and version number change if needed
(see below for formatting example)

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
