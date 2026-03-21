mod mesh;

use std::sync::Arc;
use tokio::sync::Mutex;
use mesh::MeshState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(Arc::new(Mutex::new(MeshState::new())))
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
    .invoke_handler(tauri::generate_handler![
      mesh::start_mesh_relay,
      mesh::stop_mesh_relay,
      mesh::get_local_ip,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
