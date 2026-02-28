# Tauri Migration Plan

This document captures the concrete steps needed to convert the existing static widget/editor repo into a desktop configuration manager using Tauri.

## Prerequisites

1. Install Rust (stable) via https://rustup.rs.
2. Install the Tauri CLI:
   ```sh
   cargo install tauri-cli
   ```
3. (Optional) Install Node.js/npm if you plan to run any front-end build tooling.
   The current static files do not require a build step, so node is not strictly required.

Once `cargo` is in your PATH you can run the commands below.

## Initial setup

```powershell
cd C:\Users\dalto\Documents\VS-Code\Angels-NowPlaying
# create new tauri project, using the existing directory as the web root
cargo tauri init --ci --template none
```

The `--ci --template none` flags create a minimal project without the default web assets (we already have them).
This will generate a `src-tauri/` folder containing `Cargo.toml`, `tauri.conf.json`, and a basic `main.rs`.

### Adjust `tauri.conf.json`
- Set `build.distDir` to `"../src"` (or wherever the static files live after any build step).
- Optionally configure `tauri.bundle.identifier`, `productName`, etc.
- Add any [`allowlist`](https://tauri.app/v1/api/config/#allowlist) entries you need (e.g. `fs`, `http`, `shell`).

### Move static assets
- Copy or move `src/` into the web directory expected by Tauri (usually `./src` is fine).
  You may keep the original structure; the key is that `index.html` and the `main_pages/` folder be reachable by relative paths.

## Adding backend commands

1. Define the `AppSettings` struct (see earlier sketch) in `src-tauri/src/main.rs` or a new module.
2. Expose Tauri commands using `#[tauri::command]` for:
   - `get_settings` / `save_settings`
   - `start_server` / `stop_server`
   - `load_frame_config`, `save_frame_config`, etc.
3. Implement an HTTP server (e.g. `tiny-http`, `warp`, or `axum`) in `main.rs` that runs on a background thread and reads from the configured paths.

## Frontend adjustments

* Add a small JavaScript module that invokes the new commands via `window.__TAURI__.invoke`.
* Update the editor UI to expose the network‑server settings and tuna path (persist back via `save_settings`).
* Replace CDN references (jQuery, FontAwesome) with local copies.

## Development workflow

* Run `cargo tauri dev` to launch the app in development mode; it will load the `src/` files.
* Make edits to the front-end just like before; reload in the app to see changes.
* Use `cargo tauri build` when ready to create packages for Windows/macOS/Linux.

## Git housekeeping

* `.gitignore` already contains the new Tauri `target/` and `dist/` entries.
* Ensure `Song.json` and `Artwork.png` remain ignored.
* Commit any new `src-tauri` files once they are generated.

---

This plan can live here until the migration is complete; it should help you start working with Tauri without surprises.
