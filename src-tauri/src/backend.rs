use serde::{Deserialize, Serialize};
use std::{fs, io::{self, Read, Write}, path::PathBuf, sync::{Arc, Mutex}, thread};

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
    // Reject anything that looks like a path traversal attempt
    if overlay_id.contains('/') || overlay_id.contains('\\') || overlay_id.contains("..") {
        return Err("Invalid overlay ID".to_string());
    }
    let root = project_root().map_err(|e| e.to_string())?;
    // In debug (dev), source files live under src/overlays/.
    // In release, the bundled overlay files are directly under overlays/.
    let path = if cfg!(debug_assertions) {
        root.join("src").join("overlays").join(&overlay_id).join("main.html")
    } else {
        root.join("overlays").join(&overlay_id).join("main.html")
    };
    Ok(path.to_string_lossy().into_owned())
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
    let root = project_root().map_err(|e| e.to_string())?;
    let version = fs::read_to_string(root.join("VERSION"))
        .unwrap_or_else(|_| "Unknown".to_string());
    Ok(version.trim().to_string())
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
    let root = project_root().map_err(|e| e.to_string())?;
    let dir = if cfg!(debug_assertions) {
        root.join("src").join("overlays")
    } else {
        root.join("overlays")
    };
    Ok(dir.join("settings.json"))
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

#[tauri::command]
pub fn save_overlay_settings(tuna_port: u16, dark_mode: bool, show_user_overlays: bool, show_template_starter: bool) -> Result<(), String> {
    let config = OverlaySettings { tuna_port, dark_mode, show_user_overlays, show_template_starter };
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    let path = overlay_settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, content).map_err(|e| e.to_string())
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
    let mut base = dirs::config_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    base.push("AngelsNowPlaying");
    base.push("overlays");

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

fn user_overlays_dir() -> PathBuf {
    let mut base = dirs::config_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    base.push("AngelsNowPlaying");
    base.push("overlays");
    base
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
    let overlay_id = {
        let first = archive.by_index(0).map_err(|e| e.to_string())?;
        let parts: Vec<&str> = first.name().splitn(2, '/').collect();
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
        archive.by_index(i).map(|e| e.name() == manifest_entry).unwrap_or(false)
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
        let name = file.name().to_string();
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

/// Zip a bundled overlay folder and write it to a temp file.
/// Returns the absolute path of the zip so the frontend can open a save dialog.
/// `overlay_id` must be a plain folder name — no path separators or "..".
#[tauri::command]
pub fn zip_overlay(overlay_id: String) -> Result<String, String> {
    if overlay_id.contains("..") || overlay_id.contains('/') || overlay_id.contains('\\') {
        return Err("Invalid overlay id".to_string());
    }
    let root = project_root().map_err(|e| e.to_string())?;
    let src_dir = if cfg!(debug_assertions) {
        root.join("src").join("overlays").join(&overlay_id)
    } else {
        root.join("overlays").join(&overlay_id)
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
