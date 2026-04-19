use serde::{Deserialize, Serialize};
use std::{fs, io::{self, Read, Write}, path::PathBuf, sync::{Arc, Mutex}, thread};
use tauri::Manager;

/// Returns the project root directory.
/// In debug (dev): cargo runs from `src-tauri/`, so we go up one level.
/// In release: the executable's cwd is expected to be the install root.
fn project_root() -> std::io::Result<PathBuf> {
    let cwd = std::env::current_dir()?;
    if cfg!(debug_assertions) {
        Ok(cwd.parent().map(|p| p.to_path_buf()).unwrap_or(cwd))
    } else {
        Ok(cwd)
    }
}

// location of persisted settings file
fn settings_path() -> PathBuf {
    // use `dirs` crate to locate the platform-specific config directory
    // e.g. on Windows %APPDATA%, macOS ~/Library/Application Support,
    // on Linux ~/.config
    let mut base = dirs::config_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    base.push("AngelsNowPlaying");
    base.push("settings.json");
    base
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppSettings {
    pub serve_port: u16,
    pub tuna_path: PathBuf,
    pub export_root: PathBuf,
    pub allow_remote: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            serve_port: 8253,
            tuna_path: std::env::current_dir().unwrap_or_default(),
            export_root: std::env::current_dir().unwrap_or_default(),
            allow_remote: false,
        }
    }
}

#[tauri::command]
pub fn resolve_path(relative_path: String) -> Result<String, String> {
    let base = project_root().map_err(|e| e.to_string())?;
    let abs = base.join(&relative_path);
    Ok(abs.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn get_overlay_main_path(overlay_id: String) -> Result<String, String> {
    if overlay_id.contains('/') || overlay_id.contains('\\') || overlay_id.contains("..") {
        return Err("Invalid overlay ID".to_string());
    }
    // dev: source tree; release: AppData copy extracted by extract_bundled_overlays
    let bundled = if cfg!(debug_assertions) {
        project_root()
            .map_err(|e| e.to_string())?
            .join("src").join("overlays").join(&overlay_id).join("main.html")
    } else {
        bundled_overlays_dir().join(&overlay_id).join("main.html")
    };
    if bundled.exists() {
        return Ok(bundled.to_string_lossy().into_owned());
    }
    let user_path = user_overlays_dir().join(&overlay_id).join("main.html");
    if user_path.exists() {
        return Ok(user_path.to_string_lossy().into_owned());
    }
    Err(format!("main.html not found for overlay '{}'", overlay_id))
}

/// Returns the URL to load a specific overlay's editor controls in an iframe.
/// In dev mode, returns the Vite dev server URL; in release, the overlay HTTP server URL.
#[tauri::command]
pub fn get_overlay_editor_url(overlay_id: String) -> Result<String, String> {
    if overlay_id.contains('/') || overlay_id.contains('\\') || overlay_id.contains("..") {
        return Err("Invalid overlay ID".to_string());
    }
    if cfg!(debug_assertions) {
        Ok(format!("http://localhost:5173/overlays/{}/editor.html", overlay_id))
    } else {
        let port = *USER_OVERLAY_SERVER_PORT.lock().unwrap();
        if port == 0 {
            return Err("Overlay server not running".to_string());
        }
        Ok(format!("http://127.0.0.1:{}/{}/editor.html", port, overlay_id))
    }
}

/// Navigates the main app window back to the home/index page.
/// Called from user overlay editors (running on http://127.0.0.1) where
/// direct navigation to tauri:// URLs is blocked by WebView2's cross-protocol
/// security. history.back() works because the index page is always the previous
/// entry in the WebView2 navigation history before the editor was opened.
#[tauri::command]
pub fn navigate_home(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app_handle.get_webview_window("main") {
        win.eval("history.back()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only http/https URLs are supported".to_string());
    }
    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    match fs::File::open(settings_path()) {
        Ok(mut f) => {
            let mut s = String::new();
            f.read_to_string(&mut s).map_err(|e| e.to_string())?;
            serde_json::from_str(&s).map_err(|e| e.to_string())
        }
        Err(_) => Ok(AppSettings::default()),
    }
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::create_dir_all(
        settings_path()
            .parent()
            .unwrap_or(&PathBuf::from(".")),
    )
    .map_err(|e| e.to_string())?;
    fs::write(settings_path(), content).map_err(|e| e.to_string())
}

// Simple server handle stored globally so we can shut it down later if needed.
lazy_static::lazy_static! {
    static ref SERVER_HANDLE: Arc<Mutex<Option<thread::JoinHandle<()>>>> = Arc::new(Mutex::new(None));
    /// Port the user overlay static-file server is listening on (0 = not started).
    static ref USER_OVERLAY_SERVER_PORT: Mutex<u16> = Mutex::new(0);
}

#[tauri::command]
pub fn start_server(settings: AppSettings) -> Result<(), String> {
    // if a server is already running, ignore
    let mut handle_guard = SERVER_HANDLE.lock().unwrap();
    if handle_guard.is_some() {
        return Ok(());
    }

    let t = thread::spawn(move || {
        let addr = format!("{}:{}", if settings.allow_remote { "0.0.0.0" } else { "127.0.0.1" }, settings.serve_port);
        let server = tiny_http::Server::http(&addr).expect("failed to start server");
        for request in server.incoming_requests() {
            let url = request.url().trim_start_matches('/');
            let path = if url == "Song.json" || url == "Artwork.png" {
                settings.tuna_path.join(url)
            } else {
                settings.export_root.join(url)
            };
            if let Ok(file) = fs::File::open(&path) {
                let mime = mime_guess::from_path(&path).first_or_octet_stream();
                let response = tiny_http::Response::from_file(file)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], mime.as_ref()).unwrap());
                let _ = request.respond(response);
            } else {
                let _ = request.respond(tiny_http::Response::empty(404));
            }
        }
    });

    *handle_guard = Some(t);
    Ok(())
}

#[tauri::command]
pub fn stop_server() -> Result<(), String> {
    // TODO: implement graceful shutdown by dropping server or sending interrupt
    Ok(())
}

/// Starts a lightweight HTTP server that serves static files from the user
/// overlays directory on an OS-assigned port. Called once at app startup.
/// The port can be retrieved via `get_user_overlay_server_port()`.
pub fn start_user_overlay_server() {
    let server = match tiny_http::Server::http("127.0.0.1:0") {
        Ok(s) => s,
        Err(e) => {
            log::warn!("Could not start user overlay server: {e}");
            return;
        }
    };
    let port = match server.server_addr().to_ip() {
        Some(addr) => addr.port(),
        None => {
            log::warn!("User overlay server: could not determine port");
            return;
        }
    };
    *USER_OVERLAY_SERVER_PORT.lock().unwrap() = port;
    thread::spawn(move || {
        for request in server.incoming_requests() {
            // Strip query string — needed for URLs like main.html?edit=1.
            let raw = request.url().trim_start_matches('/').to_string();
            let url = raw.split_once('?').map(|(p, _)| p).unwrap_or(&raw).to_string();

            // Virtual route: serve embedded jQuery for references like
            // "../../js/vendor/jquery-3.5.1.min.js" in main.html that resolve
            // to http://127.0.0.1:{port}/js/vendor/jquery-3.5.1.min.js.
            if url == "js/vendor/jquery-3.5.1.min.js" {
                let _ = request.respond(
                    tiny_http::Response::from_data(JQUERY_JS).with_header(
                        tiny_http::Header::from_bytes(
                            &b"Content-Type"[..],
                            &b"application/javascript"[..],
                        )
                        .unwrap(),
                    ),
                );
                continue;
            }

            // Serve CSS shared files (e.g. /css/editor-common.css) from the
            // bundled overlays css/ subdir.  editor.html files reference
            // "../../css/editor-common.css" which resolves to /css/... here.
            if let Some(css_file) = url.strip_prefix("css/") {
                if !css_file.contains("..") && !css_file.contains('/') && !css_file.contains('\\') {
                    let path = bundled_overlays_dir().join("css").join(css_file);
                    if let Ok(file) = fs::File::open(&path) {
                        let mime = mime_guess::from_path(&path).first_or_octet_stream();
                        let _ = request.respond(
                            tiny_http::Response::from_file(file).with_header(
                                tiny_http::Header::from_bytes(&b"Content-Type"[..], mime.as_ref()).unwrap(),
                            ),
                        );
                    } else {
                        let _ = request.respond(tiny_http::Response::empty(404));
                    }
                } else {
                    let _ = request.respond(tiny_http::Response::empty(400));
                }
                continue;
            }

            // Serve tuna-port.js from bundled overlays dir root.
            if url == "tuna-port.js" {
                let path = bundled_overlays_dir().join("tuna-port.js");
                if let Ok(file) = fs::File::open(&path) {
                    let _ = request.respond(
                        tiny_http::Response::from_file(file).with_header(
                            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/javascript"[..]).unwrap(),
                        ),
                    );
                } else {
                    let _ = request.respond(tiny_http::Response::empty(404));
                }
                continue;
            }

            // URL format: {overlay_id}/{filename}  (no subdirectory nesting allowed)
            // Check user overlays dir first; fall back to bundled overlays dir.
            let response: Option<tiny_http::Response<fs::File>> = (|| {
                let (overlay_id, filename) = url.split_once('/')?;
                // Path-traversal guard: no '..' and no path separators in filename
                if overlay_id.contains("..")
                    || overlay_id.contains('/')
                    || overlay_id.contains('\\')
                    || filename.contains("..")
                    || filename.contains('/')
                    || filename.contains('\\')
                {
                    return None;
                }
                let user_path = user_overlays_dir().join(overlay_id).join(filename);
                let bundled_path = bundled_overlays_dir().join(overlay_id).join(filename);
                let path = if user_path.exists() { user_path } else { bundled_path };
                let file = fs::File::open(&path).ok()?;
                let mime = mime_guess::from_path(&path).first_or_octet_stream();
                Some(
                    tiny_http::Response::from_file(file).with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], mime.as_ref())
                            .unwrap(),
                    ),
                )
            })();
            if let Some(r) = response {
                let _ = request.respond(r);
            } else {
                let _ = request.respond(tiny_http::Response::empty(404));
            }
        }
    });
}

/// Returns the port the user overlay static server is listening on.
/// Returns 0 if the server is not running.
#[tauri::command]
pub fn get_user_overlay_server_port() -> u16 {
    *USER_OVERLAY_SERVER_PORT.lock().unwrap()
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    let root = project_root().map_err(|e| e.to_string())?;
    let abs_path = root.join(&path);
    fs::read_to_string(abs_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_css_file(path: String, content: String) -> Result<(), String> {
    use std::fs;
    let root = project_root().map_err(|e| e.to_string())?;
    let abs_path = root.join(&path);
    if let Some(parent) = abs_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(abs_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

// ── Overlay settings (shared by all overlays via ../settings.json) ───────────

/// Settings written to `src/overlays/settings.json` (dev) / `overlays/settings.json` (release).
/// Overlays read this file at startup via a relative `../settings.json` fetch.
/// Extend this struct as new overlay-level options are added (e.g. dark_mode theming).
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OverlaySettings {
    pub tuna_port: u16,
    pub dark_mode: bool,
    pub show_user_overlays: bool,
    pub show_template_starter: bool,
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            tuna_port: 1608,
            dark_mode: true,
            show_user_overlays: true,
            show_template_starter: false,
        }
    }
}

fn overlay_settings_path() -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let root = project_root().map_err(|e| e.to_string())?;
        Ok(root.join("src").join("overlays").join("settings.json"))
    } else {
        // In release: write alongside the extracted bundled overlays so that
        // OBS-loaded overlays can resolve it via '../settings.json'.
        Ok(bundled_overlays_dir().join("settings.json"))
    }
}

#[tauri::command]
pub fn get_overlay_settings() -> Result<OverlaySettings, String> {
    let path = overlay_settings_path()?;
    if !path.exists() {
        return Ok(OverlaySettings::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    // Use default for any missing fields so adding new fields is non-breaking.
    let value: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let defaults = OverlaySettings::default();
    Ok(OverlaySettings {
        tuna_port: value["tuna_port"].as_u64().map(|v| v as u16).unwrap_or(defaults.tuna_port),
        dark_mode: value["dark_mode"].as_bool().unwrap_or(defaults.dark_mode),
        show_user_overlays: value["show_user_overlays"].as_bool().unwrap_or(defaults.show_user_overlays),
        show_template_starter: value["show_template_starter"].as_bool().unwrap_or(defaults.show_template_starter),
    })
}

/// Writes a tiny JS file to the bundled and user-overlay directories that
/// sets window.TUNA_PORT so common.js can read the Tuna port without XHR.
/// Called on settings save and after bundle extraction.
fn write_tuna_port_files(port: u16) {
    let content = format!("window.TUNA_PORT = {};\n", port);
    for dir in [bundled_overlays_dir(), user_overlays_dir()] {
        if let Err(e) = fs::create_dir_all(&dir) {
            log::warn!("write_tuna_port_files: could not create {}: {e}", dir.display());
            continue;
        }
        if let Err(e) = fs::write(dir.join("tuna-port.js"), &content) {
            log::warn!("write_tuna_port_files: could not write tuna-port.js: {e}");
        }
    }
}

#[tauri::command]
pub fn save_overlay_settings(tuna_port: u16, dark_mode: bool, show_user_overlays: bool, show_template_starter: bool) -> Result<(), String> {
    let config = OverlaySettings { tuna_port, dark_mode, show_user_overlays, show_template_starter };
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    let path = overlay_settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, content).map_err(|e| e.to_string())?;
    if !cfg!(debug_assertions) {
        write_tuna_port_files(tuna_port);
    }
    Ok(())
}

/// Open a native file-picker dialog and return the selected path (or None if cancelled).
#[tauri::command]
pub fn pick_file(title: String, filter_name: String, extensions: Vec<String>) -> Result<Option<String>, String> {
    let ext_strs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
    let result = rfd::FileDialog::new()
        .set_title(&title)
        .add_filter(&filter_name, &ext_strs)
        .pick_file();
    Ok(result.map(|p| p.to_string_lossy().into_owned()))
}

/// Open a native save-file dialog and return the chosen path (or None if cancelled).
#[tauri::command]
pub fn pick_save_file(title: String, default_name: String, filter_name: String, extensions: Vec<String>) -> Result<Option<String>, String> {
    let ext_strs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
    let result = rfd::FileDialog::new()
        .set_title(&title)
        .set_file_name(&default_name)
        .add_filter(&filter_name, &ext_strs)
        .save_file();
    Ok(result.map(|p| p.to_string_lossy().into_owned()))
}

/// Move (rename) a file — used to move a temp zip to the user-chosen save location.
#[tauri::command]
pub fn move_file(src: String, dest: String) -> Result<(), String> {
    fs::rename(&src, &dest).or_else(|_| {
        // rename can fail across devices; fall back to copy + delete
        fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        fs::remove_file(&src).map_err(|e| e.to_string())
    })
}

// ── Overlay listing ──────────────────────────────────────────────────────────

/// Returns all user-installed overlays found in the platform AppData overlays dir.
/// Each entry is the parsed manifest.json with two extra fields injected:
///   _source: "user"
///   _id: the folder name (stable overlay slug)
#[tauri::command]
pub fn list_user_overlays() -> Result<Vec<serde_json::Value>, String> {
    let base = user_overlays_dir();

    if !base.exists() {
        return Ok(vec![]);
    }

    let mut overlays = vec![];
    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let manifest_path = entry.path().join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }
        let content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
        let mut manifest: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let id = entry.file_name().to_string_lossy().to_string();
        manifest["_source"] = serde_json::Value::String("user".to_string());
        manifest["_id"] = serde_json::Value::String(id.clone());
        // URLs are served by the tiny_http server; port comes from settings.
        // The frontend is responsible for constructing full URLs using the stored port.
        manifest["_overlayDir"] =
            serde_json::Value::String(entry.path().to_string_lossy().to_string());
        overlays.push(manifest);
    }
    Ok(overlays)
}

// ── User overlay install / delete ────────────────────────────────────────────

// ── Compile-time embedded app assets ─────────────────────────────────────────
// These are inlined into user overlay editor.html files at install time so
// that user overlays work from file:// URLs with zero external dependencies.

const JQUERY_JS: &[u8] = include_bytes!("../../src/js/vendor/jquery-3.5.1.min.js");

const EDITOR_COMMON_CSS: &str =
    include_str!("../../src/css/editor-common.css");

const MASCOT_PNG: &[u8] =
    include_bytes!("../../src/assets/mascot.png");

const HEADER_TEXT_PNG: &[u8] =
    include_bytes!("../../src/assets/header-text.png");

fn app_data_dir() -> PathBuf {
    let mut base = dirs::config_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    base.push("AngelsNowPlaying");
    base
}

/// Bundled overlays extracted to AppData on each version change.
fn bundled_overlays_dir() -> PathBuf {
    app_data_dir().join("overlays")
}

/// User-installed overlays (zip installs via Settings).
fn user_overlays_dir() -> PathBuf {
    app_data_dir().join("user-overlays")
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Extracts all bundled overlay files from the Tauri resource directory into
/// AppData/AngelsNowPlaying/overlays/, gated by a .bundle_version stamp.
/// Only runs in release builds — dev reads from src/overlays/ directly.
/// Re-extracts (overwriting) whenever the app version changes.
pub fn extract_bundled_overlays(app_handle: &tauri::AppHandle) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Ok(());
    }

    let current_version = env!("CARGO_PKG_VERSION");
    let app_dir = app_data_dir();
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let version_file = app_dir.join(".bundle_version");
    if version_file.exists() {
        let stored = fs::read_to_string(&version_file).unwrap_or_default();
        if stored.trim() == current_version {
            return Ok(());
        }
    }

    let resource_overlays = app_handle
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("overlays");

    if !resource_overlays.exists() {
        return Err(format!(
            "Bundled overlays resource directory not found: {}",
            resource_overlays.display()
        ));
    }

    let dest = bundled_overlays_dir();
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(&resource_overlays).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src = entry.path();
        if !src.is_dir() {
            continue;
        }
        let dst = dest.join(entry.file_name());
        copy_dir_all(&src, &dst).map_err(|e| e.to_string())?;
    }

    // Write jQuery so that main.html files loaded by OBS as file:// URLs can
    // resolve '../../js/vendor/jquery-3.5.1.min.js' from the overlay directory.
    let jquery_path = app_dir.join("js").join("vendor").join("jquery-3.5.1.min.js");
    if let Some(parent) = jquery_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&jquery_path, JQUERY_JS).map_err(|e| e.to_string())?;

    // Write header image assets so all overlay editors can reference them
    // consistently via the HTTP server or absolute file paths.
    let assets_dir = app_dir.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    fs::write(assets_dir.join("mascot.png"), MASCOT_PNG).map_err(|e| e.to_string())?;
    fs::write(assets_dir.join("header-text.png"), HEADER_TEXT_PNG).map_err(|e| e.to_string())?;

    // Write editor-common.css to css/ subdir so the overlay HTTP server can serve
    // it at /css/editor-common.css (referenced by editor.html as "../../css/editor-common.css").
    let css_dir = bundled_overlays_dir().join("css");
    fs::create_dir_all(&css_dir).map_err(|e| e.to_string())?;
    fs::write(css_dir.join("editor-common.css"), EDITOR_COMMON_CSS).map_err(|e| e.to_string())?;

    // Read current tuna port from saved settings (or default 1608) and write
    // tuna-port.js so OBS-loaded main.html files can find the port without XHR.
    let tuna_port = get_overlay_settings().map(|s| s.tuna_port).unwrap_or(1608);
    write_tuna_port_files(tuna_port);

    fs::write(&version_file, current_version).map_err(|e| e.to_string())?;
    Ok(())
}

/// Install a user overlay from a zip file path.
/// The zip must contain a single top-level folder whose name is the overlay id.
/// That folder must contain a manifest.json at its root.
/// Returns the installed overlay id on success.
#[tauri::command]
pub fn install_overlay(zip_path: String) -> Result<String, String> {
    let dest_root = user_overlays_dir();

    // Read the zip archive first so we can validate before touching disk.
    let zip_bytes = fs::read(&zip_path).map_err(|e| format!("Cannot read zip: {e}"))?;
    let cursor = std::io::Cursor::new(&zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("Invalid zip: {e}"))?;

    // Determine the top-level folder name (the overlay id).
    // All entries must share the same top-level prefix.
    // Normalize backslashes → forward slashes (PowerShell Compress-Archive uses backslashes).
    let overlay_id = {
        let first = archive.by_index(0).map_err(|e| e.to_string())?;
        let normalized = first.name().replace('\\', "/");
        let parts: Vec<&str> = normalized.splitn(2, '/').collect();
        if parts.is_empty() || parts[0].is_empty() {
            return Err("Zip must contain a single top-level folder".to_string());
        }
        parts[0].to_string()
    };

    // Reject ids that look like path traversal.
    if overlay_id.contains("..") || overlay_id.contains('/') || overlay_id.contains('\\') {
        return Err("Invalid overlay id in zip".to_string());
    }

    // Require manifest.json to be present inside that folder.
    let manifest_entry = format!("{}/manifest.json", overlay_id);
    let has_manifest = (0..archive.len()).any(|i| {
        archive
            .by_index(i)
            .map(|e| e.name().replace('\\', "/") == manifest_entry)
            .unwrap_or(false)
    });
    if !has_manifest {
        return Err(format!("Zip does not contain {manifest_entry}"));
    }

    let dest = dest_root.join(&overlay_id);
    if dest.exists() {
        return Err(format!("An overlay named '{overlay_id}' is already installed. Delete it first."));
    }
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    // Extract — skip the top-level folder entry itself.
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        // Normalize backslashes so strip_prefix and path splitting work correctly.
        let name = file.name().replace('\\', "/");
        // strip the leading "overlay_id/" prefix
        let relative = match name.strip_prefix(&format!("{}/", overlay_id)) {
            Some(r) => r.to_string(),
            None => continue, // this is the top-level dir entry itself
        };
        if relative.is_empty() {
            continue;
        }
        // Guard against zip-slip: no path component may be ".."
        if relative.split('/').any(|part| part == "..") {
            return Err(format!("Unsafe path in zip: {name}"));
        }
        let out_path = dest.join(&relative);
        if file.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            io::copy(&mut file, &mut out_file).map_err(|e| e.to_string())?;
        }
    }

    Ok(overlay_id)
}

/// Delete a user-installed overlay by id.
/// Only overlays in the user AppData dir can be deleted — bundled overlays are untouched.
#[tauri::command]
pub fn delete_user_overlay(overlay_id: String) -> Result<(), String> {
    if overlay_id.contains("..") || overlay_id.contains('/') || overlay_id.contains('\\') {
        return Err("Invalid overlay id".to_string());
    }
    let target = user_overlays_dir().join(&overlay_id);
    if !target.exists() {
        return Err(format!("Overlay '{}' not found", overlay_id));
    }
    fs::remove_dir_all(&target).map_err(|e| e.to_string())
}

// ── Zip a bundled overlay for download ───────────────────────────────────────

/// Returns the absolute path to `main.css` for any overlay — bundled or user-installed.
/// The JS editor loader uses this so it never has to hardcode or guess the path itself.
#[tauri::command]
pub fn get_overlay_css_path(overlay_id: String) -> Result<String, String> {
    if overlay_id.contains('/') || overlay_id.contains('\\') || overlay_id.contains("..") {
        return Err("Invalid overlay ID".to_string());
    }
    // dev: source tree; release: AppData copy extracted by extract_bundled_overlays
    let bundled = if cfg!(debug_assertions) {
        project_root()
            .map_err(|e| e.to_string())?
            .join("src").join("overlays").join(&overlay_id).join("main.css")
    } else {
        bundled_overlays_dir().join(&overlay_id).join("main.css")
    };
    if bundled.exists() {
        return Ok(bundled.to_string_lossy().into_owned());
    }
    let user_path = user_overlays_dir().join(&overlay_id).join("main.css");
    if user_path.exists() {
        return Ok(user_path.to_string_lossy().into_owned());
    }
    Err(format!("main.css not found for overlay '{}'", overlay_id))
}

/// Read a file from an absolute path on disk.
/// Used by the editor header loader when working with user-installed overlays
/// stored in AppData (where paths cannot be expressed relative to project root).
#[tauri::command]
pub fn read_file_abs(path: String) -> Result<String, String> {
    let p = std::path::PathBuf::from(&path);
    if p.is_relative() {
        return Err("Expected an absolute path".to_string());
    }
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

/// Write content to a file at an absolute path on disk.
/// Counterpart to read_file_abs; used for saving user-installed overlay CSS.
#[tauri::command]
pub fn save_file_abs(path: String, content: String) -> Result<(), String> {
    let p = std::path::PathBuf::from(&path);
    if p.is_relative() {
        return Err("Expected an absolute path".to_string());
    }
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&p, content).map_err(|e| e.to_string())
}

/// Zip a bundled overlay folder and write it to a temp file.
/// Returns the absolute path of the zip so the frontend can open a save dialog.
/// `overlay_id` must be a plain folder name — no path separators or "..".
#[tauri::command]
pub fn zip_overlay(overlay_id: String) -> Result<String, String> {
    if overlay_id.contains("..") || overlay_id.contains('/') || overlay_id.contains('\\') {
        return Err("Invalid overlay id".to_string());
    }
    let src_dir = if cfg!(debug_assertions) {
        project_root()
            .map_err(|e| e.to_string())?
            .join("src").join("overlays").join(&overlay_id)
    } else {
        bundled_overlays_dir().join(&overlay_id)
    };
    if !src_dir.exists() {
        return Err(format!("Overlay '{}' not found", overlay_id));
    }

    let tmp_path = std::env::temp_dir().join(format!("{}.zip", overlay_id));
    let tmp_file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
    let mut zip_writer = zip::ZipWriter::new(tmp_file);
    let options: zip::write::FileOptions<'_, ()> =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    fn add_dir_to_zip(
        writer: &mut zip::ZipWriter<fs::File>,
        base: &PathBuf,
        current: &PathBuf,
        prefix: &str,
        options: zip::write::FileOptions<'_, ()>,
    ) -> Result<(), String> {
        let entries = fs::read_dir(current).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
            let zip_name = format!("{}/{}", prefix, rel.to_string_lossy().replace('\\', "/"));
            if path.is_dir() {
                writer.add_directory(&zip_name, options).map_err(|e| e.to_string())?;
                add_dir_to_zip(writer, base, &path, prefix, options)?;
            } else {
                writer.start_file(&zip_name, options).map_err(|e| e.to_string())?;
                let data = fs::read(&path).map_err(|e| e.to_string())?;
                writer.write_all(&data).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    add_dir_to_zip(&mut zip_writer, &src_dir, &src_dir, &overlay_id, options)?;
    zip_writer.finish().map_err(|e| e.to_string())?;

    Ok(tmp_path.to_string_lossy().into_owned())
}
