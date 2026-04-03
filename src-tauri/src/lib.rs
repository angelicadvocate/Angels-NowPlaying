mod backend;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      backend::get_settings,
      backend::save_settings,
      backend::start_server,
      backend::stop_server,
      backend::read_text_file,
      backend::save_css_file,
      backend::get_version,
      backend::list_user_overlays,
      backend::open_url,
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
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
