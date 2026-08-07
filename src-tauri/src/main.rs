// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use tauri::State;

mod commands;
use commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            validate_directory,
            create_directories,
            get_directory_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}