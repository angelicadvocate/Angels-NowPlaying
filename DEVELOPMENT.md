# Development Guide

This guide covers setting up a development build of Angels-NowPlaying and contributing to the main project.

For building **custom overlays** (the HTML/CSS/JS frames that run in OBS), see [FRAME-DEVELOPMENT.md](FRAME-DEVELOPMENT.md) instead.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) |
| Backend (Rust) | `src-tauri/src/` — Tauri commands, HTTP server, settings persistence |
| Frontend (app UI) | Plain HTML/CSS/JS in `src/main_pages/` — no framework |
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
    main_pages/       App UI pages (index, settings, store, instructions)
    editor_pages/     Shared editor header HTML
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
      main_pages/     App-level stylesheets (one per page)
      editor_pages/   Shared editor header and common editor styles
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

These are the commands available to frontend JS via `window.__TAURI__.invoke(...)`:

| Command | Purpose |
|---|---|
| `get_overlay_settings` | Read `src/overlays/settings.json` (tuna_port, dark_mode) |
| `save_overlay_settings` | Write `src/overlays/settings.json` |
| `read_text_file` | Read any project file as raw text (used by editors to load CSS) |
| `save_css_file` | Write a CSS file back to disk (used by editors on Save) |
| `list_user_overlays` | Discover installed overlays from `src/overlays/` (dev) or AppData (release) |
| `get_overlay_main_path` | Resolve the absolute path to an overlay's `main.html` |
| `get_version` | Read `VERSION` file |
| `start_server` / `stop_server` | Control the embedded HTTP server (tiny_http) |
| `open_url` | Open a URL in the system browser |
| `resolve_path` | Resolve a project-relative path to absolute |
| `pick_file` | Native file-picker dialog (rfd) |

---

## Settings persistence

`src/overlays/settings.json` is written at runtime and is **not checked in** (`.gitignore`). It holds:

```json
{
  "tuna_port": 1608,
  "dark_mode": true
}
```

Overlays read this file at startup via a relative `../settings.json` fetch to pick up the Tuna port.

The app-level `AppSettings` struct (serve port, export root, etc.) is persisted separately to the platform config directory (`%APPDATA%/AngelsNowPlaying/settings.json` on Windows).

---

## Making changes

### App UI pages (`src/main_pages/`)

Standard HTML/CSS/JS. Tauri APIs are available via `window.__TAURI__.invoke(...)`. The Vite dev server provides hot reload.

### Overlay editors (`src/overlays/*/editor.html`)

Also plain HTML/CSS/JS. Use `invoke('read_text_file', ...)` and `invoke('save_css_file', ...)` for disk access — do **not** use `fetch('./main.css')` in editors since Vite's dev server transforms CSS files and writing the result back will corrupt them.

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

- **Roll out the iframe editor pattern** to the remaining overlay editors (they still use a static mock DOM — see the `frame-template-starter` editor for the target pattern)
- **Light mode implementation** — the CSS currently hardcodes dark colours; a CSS custom property palette is needed
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
