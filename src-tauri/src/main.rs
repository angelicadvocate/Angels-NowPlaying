#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, Menu, MenuItem, Submenu};

fn main() {
    tauri::Builder::default()
        // .invoke_handler(tauri::generate_handler![get_settings, save_settings, start_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
