// Verhindert im Release-Build ein zusätzliches Konsolenfenster unter Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    devlog_lib::run()
}
