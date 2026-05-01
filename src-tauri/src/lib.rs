mod backend;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      backend::get_settings,
      backend::save_settings,
      backend::apply_serve_http_settings,
      backend::get_serve_http_status,
      backend::read_text_file,
      backend::save_css_file,
      backend::get_version,
      backend::list_user_overlays,
      backend::open_url,
      backend::open_app_data_dir,
      backend::resolve_path,
      backend::get_overlay_main_path,
      backend::get_overlay_settings,
      backend::save_overlay_settings,
      backend::pick_file,
      backend::pick_save_file,
      backend::move_file,
      backend::install_overlay,
      backend::delete_user_overlay,
      backend::zip_overlay,
      backend::get_overlay_css_path,
      backend::read_file_abs,
      backend::save_file_abs,
      backend::get_user_overlay_server_port,
      backend::navigate_home,
      backend::get_overlay_editor_url,
      backend::list_bundled_fonts,
      backend::list_user_fonts,
      backend::install_font,
      backend::delete_user_font,
      backend::reset_app_data,
      backend::exit_app,
      backend::get_diagnostics,
      backend::create_backup,
      backend::restore_backup,
      backend::arm_pending_restore,
      backend::prune_snapshots,
      backend::consume_restore_success_flag,
      backend::read_changelog,
      backend::download_and_install_overlay,
    ])
    .setup(|app| {
      if let Err(e) = backend::extract_bundled_overlays(&app.handle()) {
        log::warn!("Failed to extract bundled overlays: {e}");
      }
      if let Err(e) = backend::ensure_user_fonts_dir_public() {
        log::warn!("Failed to initialize user fonts dir: {e}");
      }
      // If the previous launch armed a pending restore (auto-updater
      // snapshot), replay it now — bundled overlays have just been freshly
      // extracted, so any saved customizations get re-merged onto them.
      backend::consume_pending_restore_if_armed();
      backend::start_user_overlay_server();
      // Auto-start the optional user-toggled HTTP server if the master
      // toggle in AppSettings is on. No-op when disabled. Bind errors are
      // captured internally and surfaced via get_serve_http_status().
      let _ = backend::apply_serve_http_settings();
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      if let Some(window) = app.get_webview_window("main") {
        if let Some(icon) = app.default_window_icon() {
          let _ = window.set_icon(icon.clone());
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
