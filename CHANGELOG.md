# CHANGELOG

All notable changes to this project will be documented in this file.

Please be sure to add date, completed tag, `github:[username]`, and version number change if needed
(see below for formatting example)

---------------------------------------------------------------------------------

- [X] **First Frame** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.1.0**
  -Initial single creation of F1 frame for use within OBS
---------------------------------------------------------------------------------

- [X] **Create Base Pages** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.2.0**
  -Creation of F2, F3, and F4 for use within OBS
---------------------------------------------------------------------------------

- [X] **Create Editor** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.0**
  -Creation of Editor Pages for use with the 4 Frames
---------------------------------------------------------------------------------

- [X] **Normalize F2 runtime HTML** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - Updated F2 to use `.text-clip` class for consistency
  - Ensures compatibility with shared JS scroller logic
---------------------------------------------------------------------------------

- [X] **Fix F3 scroller slowdown** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - Rewrote scroller to use transform + requestAnimationFrame
  - Updated reveal logic to improve performance
  - Eliminated sluggish animation behavior
---------------------------------------------------------------------------------

- [X] **Revert temporary debug values** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - Removed `data-debug-scroller` usage from production code
  - Cleaned debug console output from `js/common.js`
  - Backup `js/common.js.bak` retained for reference
---------------------------------------------------------------------------------

- [X] **Polish js/common.js and clean debug logs** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - Removed development debug statements
  - Cleaned up code comments and formatting
  - Finalized production-ready common JavaScript library
---------------------------------------------------------------------------------

- [X] **Smoke-test F1–F4 frames** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - User confirmed F1–F4 tested and working in OBS
  - All frames display properly with current song data
  - Text scrolling and progress bars functional
---------------------------------------------------------------------------------

- [X] **Add version tracking and metadata** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.3.4**
  - Created VERSION file with current version 0.3.4
  - Added project.json with comprehensive project metadata
  - Added version comments to main files for tracking
---------------------------------------------------------------------------------

- [X] **File naming standardization and workspace cleanup** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.4.0**
  - Renamed all editor files from `01-EditorV2-Frame1.html` format to clean `F1-Editor.html` format
  - Renamed all CSS files from `01-EditorV2-F1-Styles.css` to `F1-Editor.css` format  
  - Updated all references in dashboard (`00-TemplateEditor.html`) to use new file names
  - Updated CSS links in all HTML editor files to match new naming convention
  - Separated inline CSS from `instructions.html` into external `instructions.css` file
  - Significantly improved workspace organization and maintainability
---------------------------------------------------------------------------------

- [X] **Added more template cards to dashboard** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.4.1**
   - Added new card for templates for frames 8-11
   - Added basic descriptions for future designs
   - Fixed scrolling bug on main TemplateEditor dashboard page
---------------------------------------------------------------------------------

- [X] **F8 Vinyl Editor Implementation & Refactor** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.4.2** *(2025-10-26)*
   - Created F8 vinyl editor structure with vinyl-only preview, removed cassette toggle and assets
   - Added slider controls for font size, accent color, vertical offset, and drop shadow
   - Refactored CSS generation to use a single scale variable for all elements (matches F1 approach)
   - Ensured all generated CSS and runtime CSS use the scale variable for maintainability
   - Improved centering, overflow handling, and visual accuracy in preview and output
   - Finalized font-family and margin consistency between editor and OBS display page
   - Added rotation effect to background image for vinyl preview
   - Reset album art opacity to full, improved drop shadow prominence
---------------------------------------------------------------------------------

- [X] **OBS Display Page & Data Fetch Fixes (F8)** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.4.2** *(2025-10-26)*
   - Created 08-NowPlaying-F8.html for OBS display, matching F8 editor output
   - Fixed JSON fetch logic to correctly display artist name and track name
   - Synced font-family, margin, and layout between editor and OBS page
   - Ensured drop shadow and accent color match editor defaults
   - Moved inline CSS to external file for maintainability
---------------------------------------------------------------------------------

- [X] **Dashboard & Template Management Updates** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.4.2** *(2025-10-26)*
   - Added F8 preview image and updated description in 00-TemplateEditor.html
   - Removed cassette tape option, updated glassmorphism/cassette template order and descriptions
   - Ensured template cards and preview images reflect latest changes
   - Updated OBS dimensions and template metadata where needed
---------------------------------------------------------------------------------

- [X] **Settings Page UI Implementation & Header Standardization** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.0** *(2025-12-07)*
   - Built comprehensive settings.html page with dark mode toggle, template management, and about section
   - Added GitHub avatar to About card with dynamic URL and responsive sizing (144px desktop → 81px mobile)
   - Created reusable unified header template across settings, store, and instructions pages with support, share, and action buttons
   - Standardized header layout across all main pages with consistent padding, margins, and button spacing (no layout shift on navigation)
   - Integrated dynamic version loading from VERSION file to settings page for automatic version display updates
   - Implemented template management UI components (upload modal, delete dropdown) ready for Tauri backend integration
   - Added check for updates button and status display framework for future update notification system
   - Created reusable header component for individual overlay template editors (F7 editor as reference implementation)
   - Built F7 cassette tape overlay template with visual editor controls and generated CSS output
   - Created store.html base page with unified header and "Coming Soon" placeholder ready for future store embedded iframe
   - Standardized page formatting and styling across dashboard, editors, and main pages with responsive media queries
   - Added welcome card to 00-TemplateEditor.html dashboard with instructions and project overview
   - Removed scrollbars globally across all pages using CSS methods compatible with OBS embedded Chromium
   - Made instructions page content-agnostic by removing conflicting global styles while preserving header design consistency
   - Restructured project directory layout for Tauri migration: moved main display pages to `src/main_pages/`, editor pages to `src/editor_pages/`, consolidated styles to `src/css/main_pages/` and `src/css/editor_pages/`, moved all assets to `src/assets/`, and JavaScript utilities to `src/js/`
   - Corrected all relative file paths after restructure: updated asset references from `static_assets/` to `../assets/`, editor links from `editor_assets/` to `../editor_pages/`, CSS links to point to new directory structure, and fixed HTML linking between pages
---------------------------------------------------------------------------------

- [X] **Header Module Implementation & Editor Layout Fixes** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.1** *(2025-12-08)*
   - Created reusable header module with logo, back button, page title, copy URL, and save button (header.css)
   - Integrated header into F1, F2, F3, and F4 editor pages with proper save button callback functionality
   - Removed old bottom save buttons from F3 and F4 editors, moved save functionality to header save button
   - Fixed save button event handling - ensured header save button calls applyPreview() and downloadCSS() for CSS generation
   - Anchored header to top of page with flex-shrink: 0 to prevent layout collapse
   - Fixed layout gaps by removing justify-content centering from body flexbox and setting proper flex alignment
   - Removed excessive padding and margins from #site, #sample, #controls, and #editor-header elements
   - Set --editor-preview-padding-top to 0 to eliminate 140px vertical gap in F3 editor
   - Simplified body layout to use flex-direction: column with no centering to prevent space waste
   - Added global margin/padding resets to header elements to eliminate cascading spacing issues
   - Created F11 editor page with header module integrated
   - Standardized all editor pages to use consistent header styling and save functionality across F1-F4
---------------------------------------------------------------------------------

- [X] **Created F10 Editor Base** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.1** *(2025-12-09)*
   - Created base for F10 Editor page
   - Still needs to be implemented:
       - Font picker
       - Rearrange sliders to balance columns
       - Text position up/down
       - Progress bar position up down
   - Awaiting further testing
---------------------------------------------------------------------------------

- [X] **Created F9 Editor Base** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.1** *(2025-12-12)*
   - Created base for F9 Editor page
   - Still needs to be implemented:
       - Thumbnail image correction for transparency (or)
       - Thumbnail image generation for light mode switch
   - Awaiting further testing
   - Future general editor page enhancement:
       - All pages need to be updated to use the same height for the dropdowns, color pickers, and sliders for better alignment
---------------------------------------------------------------------------------

- [X] **Finished F9 & F10 Editor / Created F5 & F6 Base** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.2** *(2025-12-13)*
   - Added the rest of the sliders to F10 Editor controls
   - Corrected drop shaddows on text and album art for F10
   - Generated new thumbnail for F10 Overlay
   - Created base for F5 Editor page
   - Created base for F6 Editor page
   - Unified the header module for the editor pages to match the layout used in the other pages.
   - Various tweaks to multiple eidtor pages.
   - Created editor-common.css for shared css values
   - Fixed scaling of frame on f9 editor page
   - Added additional controls to f1-f4 pages
   - Updated thumbnails for several overlay pages (still need to update f1 thumbnail)
   - Adjusted styling on controls, dropdowns, and color pickers to be consistent
---------------------------------------------------------------------------------

- [X] **Polish Existing Layouts in Editor Pages** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.5.3** *(2025-12-14)*
  - Standardized layouts for F1, F2, F5, F6, and F7 to match F9, including moving the preview to the bottom (completed)
  - Adjusted control positioning on F3 and F8 to improve alignment and visual balance
  - Added an additional control to F1 (color picker) to better balance the layout
  - Updated and styled editor page header titles for improved consistency and readability
  - Added missing HTML templates for NowPlaying pages (F11, F10, F09, F06, F05)
  - Added missing CSS files for NowPlaying pages (F11, F10, F09)
  - Consolidated shared CSS selectors into editor-common.css
  - Unified and corrected HTML structure across similarly designed pages for clarity and consistency
  - Fine-tuned layouts to align updated HTML with existing CSS, with minor exceptions for unique pages
  - Applied various styling refinements across all editor pages
  - Planned potential restructure for src. (see restructure-src-plan.md)
  ---------------------------------------------------------------------------------

- [X] **Initial Tauri app skeleton added** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.6.0** *(2026-02-27)*
  - Added initial `src-tauri/` with `Cargo.toml`, `tauri.conf.json`, and `src/main.rs`
  - Added basic app settings UI / network server settings command footing
  - Not yet fully tested; initial migration step completed
  ---------------------------------------------------------------------------------

- [X] **Minor Tauri patch applied** ✨ *COMPLETED* `github:AngelicAdvocate` **v0.6.1** *(2026-02-27)*
  - Fixed issue (that I created) where tauri would fail to load in pages by default leading in a 404
  - Pages now load, but editor interface is still incomplete/ has bugs. see TODO.md for planned resolution.
  ---------------------------------------------------------------------------------
