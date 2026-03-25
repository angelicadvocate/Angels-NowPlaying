use serde::{Deserialize, Serialize};
use std::{fs, io::Read, path::PathBuf, sync::{Arc, Mutex}, thread};

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
pub fn save_css_file(path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    let path = Path::new(&path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, content).map_err(|e| e.to_string())
}
