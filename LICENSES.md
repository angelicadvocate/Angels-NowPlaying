# Licensing

## Angels-NowPlaying application

The Angels-NowPlaying application is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0).

This covers the full application source:

- `src-tauri/` — Rust backend, Tauri commands
- `src/main_pages/` — app UI HTML pages
- `src/editor_pages/` — shared editor header HTML
- `src/js/` — app-level JavaScript
- `src/css/` — app-level stylesheets

## Bundled overlays

The overlays shipped with the application (`src/overlays/frame-*/`) are also licensed under GPL-3.0 as part of this repository.

## Custom and user-created overlays

**Using this application to run, edit, or distribute an overlay does not make that overlay a derivative work of Angels-NowPlaying.**

Overlays are independent HTML/CSS/JS files loaded by OBS Browser Source. They communicate with the Tuna OBS plugin directly via its local HTTP endpoint. They are not linked against, do not incorporate, and have no compile-time dependency on any portion of the Angels-NowPlaying codebase.

You may license your own overlays however you choose — MIT, Creative Commons, proprietary, or any other terms — without any GPL obligations arising from this application.

## Third-party components

| Component | License | Location |
|---|---|---|
| [jQuery 3.5.1](https://jquery.com) | [MIT](https://github.com/jquery/jquery/blob/main/LICENSE.txt) | `src/js/vendor/jquery-3.5.1.min.js` |