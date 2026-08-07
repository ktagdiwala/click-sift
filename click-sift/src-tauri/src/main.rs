// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
use commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            validate_directory,
            create_directories,
            get_image_files,
            move_file,
            rename_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
