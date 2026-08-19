// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
use commands::*;
use std::fs;

#[tauri::command]
fn read_image_bytes(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init()) // <-- ADD THIS LINE HERE
        .invoke_handler(tauri::generate_handler![
            validate_directory,
            create_directories,
            get_image_files,
            move_file,
            rename_file,
            get_image_rating,
			set_image_rating,
            read_image_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
