// Der Rust-Teil bleibt bewusst klein: Er startet nur das Fenster und stellt
// SQLite über das SQL-Plugin bereit. Die gesamte Logik lebt in TypeScript
// (@devlog/core), damit Desktop und Handy denselben Code nutzen.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von DevLog");
}
