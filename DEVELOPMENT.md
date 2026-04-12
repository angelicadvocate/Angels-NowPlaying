# Development Guide

This guide covers setting up a development build of Angels-NowPlaying and contributing to the main project.

For building **custom overlays** (the HTML/CSS/JS frames that run in OBS), see [FRAME-DEVELOPMENT.md](FRAME-DEVELOPMENT.md) instead.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) |
| Backend (Rust) | `src-tauri/src/` — Tauri commands, HTTP server, settings persistence |
| Frontend (app UI) | Plain HTML/CSS/JS in `src/` — no framework |
| Overlay runtime | Plain HTML/CSS/JS in `src/overlays/` — runs inside OBS Browser Source |
| Overlay editors | Plain HTML/CSS/JS in `src/overlays/<name>/editor.html` — loaded inside the app |
| Build tooling | [Vite](https://vitejs.dev) (dev server + bundler) |
| Package manager | npm |

---

## Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended)
- [Rust](https://rustup.rs) (stable toolchain)
- Tauri v2 system dependencies for your platform — follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
- On Windows: the Visual Studio C++ build tools (included with VS 2022 or the standalone Build Tools package)

---

## Getting started

```bash
git clone https://github.com/angelicadvocate/Angels-NowPlaying.git
cd Angels-NowPlaying
npm install
cargo tauri dev
```

`cargo tauri dev` starts the Vite dev server and launches the Tauri desktop window pointing at it. Hot-reload works for the app UI pages; changes to Rust code require a restart.

---

## Project structure

```
Angels-NowPlaying/
  src/
    index.html         Home page
    html/
      settings.html     Settings page
      store.html        Overlay store / picker
      instructions.html Instructions page
      editor-header.html  Shared editor header fragment
    overlays/         One subfolder per overlay — each is a self-contained module
      frame-*/
        main.html     OBS Browser Source entry point
        main.css      All tunable values as CSS custom properties in :root
        editor.html   Visual editor loaded inside the app
        editor.css    Editor layout and preview styles
        common.js     Polls Tuna HTTP endpoint, updates DOM, drives scroller
        manifest.json Overlay metadata (id, name, obsSize, tags, etc.)
        preview.png   Thumbnail shown on the home page
    css/
      index.css       Home page styles
      settings.css    Settings page styles
      store.css       Store page styles
      instructions.css  Instructions page styles
      editor-common.css  Shared editor layout styles
      editor-header.css  Shared editor header styles
    js/
      common.js       (legacy — overlays each carry their own copy)
      editor-header-loader.js  Injects shared header into overlay editors
      tauri.js        Tauri API bridge for app pages
    assets/           Shared images (mascot, header graphic, etc.)
  src-tauri/
    src/
      main.rs         Tauri entry point
      lib.rs          invoke_handler — registers all Tauri commands
      backend.rs      All Tauri command implementations
    Cargo.toml
    tauri.conf.json
  DEVELOPMENT.md      This file
  FRAME-DEVELOPMENT.md  Guide for building custom overlays
  TODO.md             Tracked work items
  CHANGELOG.md        Release notes
```

---

## Key Tauri commands (backend.rs)

These are the commands available to frontend JS via `window.__TAURI__.invoke(...)` (or `window.tauri.invoke(...)` in user overlay editors):

| Command | Purpose |
|---|---|
| `get_overlay_settings` | Read `src/overlays/settings.json` (tuna_port, dark_mode, show_user_overlays) |
| `save_overlay_settings` | Write `src/overlays/settings.json` |
| `get_overlay_css_path` | Resolve absolute path to an overlay's `main.css` (checks bundled then AppData) |
| `get_overlay_main_path` | Resolve absolute path to an overlay's `main.html` (checks bundled then AppData) |
| `read_file_abs` | Read a file at an absolute path (used by editor header loader) |
| `save_file_abs` | Write a file at an absolute path (used by editor header loader Save button) |
| `list_user_overlays` | Scan `%APPDATA%/AngelsNowPlaying/overlays/` and return parsed manifests |
| `install_overlay` | Extract a zip to the user overlays AppData dir; post-processes `editor.html` to inline shared app assets |
| `delete_user_overlay` | Remove a user-installed overlay from AppData |
| `zip_overlay` | Package a bundled overlay as a zip for download |
| `get_editor_header_html` | Return the editor header HTML fragment with CSS and images inlined (used by user overlay editors served from `http://127.0.0.1`) |
| `get_user_overlay_server_port` | Return the port the user overlay static-file server is listening on |
| `navigate_home` | Navigate the main window back to the index page via `history.back()` eval (used by user overlay editors) |
| `get_version` | Read `VERSION` file |
| `start_server` / `stop_server` | Control the OBS-facing HTTP server (tiny_http) |
| `open_url` | Open a URL in the system browser |
| `resolve_path` | Resolve a project-relative path to absolute |
| `pick_file` / `pick_save_file` | Native file-picker dialogs (rfd) |

---

## Settings persistence

`src/overlays/settings.json` is written at runtime and is **not checked in** (`.gitignore`). It holds:

```json
{
  "tuna_port": 1608,
  "dark_mode": true,
  "show_user_overlays": true,
  "show_template_starter": false
}
```

Overlays read this file at startup via a relative `../settings.json` fetch to pick up the Tuna port.

The app-level `AppSettings` struct (serve port, export root, etc.) is persisted separately to the platform config directory (`%APPDATA%/AngelsNowPlaying/settings.json` on Windows).

---

## Making changes

### App UI pages (`src/`)

Standard HTML/CSS/JS. Tauri APIs are available via `window.__TAURI__.invoke(...)`. The Vite dev server provides hot reload.

### Overlay editors (`src/overlays/*/editor.html`)

Also plain HTML/CSS/JS. Each editor page must expose one function:

```js
window.buildRootBlock = function buildRootBlock(vars) {
  // vars — object with the current CSS custom property values
  // Return an updated :root { ... } string with the new values
  return `:root {\n  --my-var: ${someInput.value};\n  // ...
}`;
};
```

The shared `editor-header-loader.js` owns all three action buttons (Save, Copy URL, Back). It:
- Injects the `editor-header.html` fragment into `#header-root`
- Reads the overlay's `main.css` via `get_overlay_css_path` + `read_file_abs`
- Fires a `headerLoaded` CustomEvent with `{ pageTitle, cssVars, cssPath }` when ready
- On Save: calls `window.buildRootBlock(cssVars)` and writes the result via `save_file_abs`
- On Copy URL: resolves `main.html` via `get_overlay_main_path` and writes to clipboard
- On Back: `history.back()`

Your editor script should initialise controls inside a `headerLoaded` listener:

```js
document.addEventListener('headerLoaded', ({ detail: { cssVars } }) => {
  // populate controls from cssVars['--my-var'] etc.
});
```

Do **not** use `fetch('./main.css')` in editors — Vite's dev server transforms CSS files and writing the result back will corrupt them. Use the Tauri commands instead (handled automatically by `editor-header-loader.js`).

The editor preview is an `<iframe src="./main.html?edit=1">`. CSS variable updates are sent to it via `postMessage({ type: 'setCSSVar', name, value })`.

### Rust backend (`src-tauri/src/backend.rs`)

Add new commands here, register them in the `tauri::generate_handler![]` call in `lib.rs`, and call them from JS with `window.__TAURI__.invoke('command_name', { param: value })`. Tauri converts Rust `snake_case` param names to JS `camelCase` automatically.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow existing code style — no framework on the frontend, keep Rust commands thin (IO and serialisation only, no business logic in `main.rs`).
3. Test your changes in the Tauri dev window and, if they affect overlays, test the OBS Browser Source output with Tuna running.
4. Open a pull request against `main` with a clear description of what changed and why.

### What's most useful right now

See [TODO.md](TODO.md) for the full list. High-impact areas:

- **Pre-ship QA** — test each bundled overlay in OBS end-to-end with Tuna running
- **Auto-update wiring** — replace the mock `setTimeout` in settings with a real Tauri updater call
- **CI/CD pipeline** — GitHub Actions build for Windows `.msi`, macOS `.dmg`, Linux `.AppImage`

---

## Reporting issues

Open an issue on [GitHub](https://github.com/angelicadvocate/Angels-NowPlaying/issues). Include:
- OS and version
- Angels-NowPlaying version (shown in Settings)
- OBS and Tuna versions
- Steps to reproduce
- Any console errors (OBS: right-click Browser Source → Interact → open DevTools)
