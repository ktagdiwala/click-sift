use std::fs;
use std::path::{Path};
use tauri::command;

#[command]
pub fn validate_directory(path: String) -> Result<bool, String> {
    let p = Path::new(&path);
    
    if !p.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    
    if !p.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    match fs::metadata(&path) {
        Ok(metadata) => {
            if metadata.permissions().readonly() {
                Err(format!("Directory is read-only: {}", path))
            } else {
                Ok(true)
            }
        }
        Err(e) => Err(format!("Cannot read directory: {}", e)),
    }
}

#[command]
pub fn create_directories(target_dir: String, keep_dir: String, discard_dir: String) -> Result<(), String> {
    let target_path = Path::new(&target_dir);
    
    if !target_path.exists() || !target_path.is_dir() {
        return Err("Target directory is invalid".to_string());
    }
    
    let keep_path = target_path.join(&keep_dir);
    let discard_path = target_path.join(&discard_dir);
    
    if !keep_path.exists() {
        fs::create_dir_all(&keep_path)
            .map_err(|e| format!("Failed to create keep directory: {}", e))?;
    }
    
    if !discard_path.exists() {
        fs::create_dir_all(&discard_path)
            .map_err(|e| format!("Failed to create discard directory: {}", e))?;
    }
    
    Ok(())
}

#[command]
pub fn get_image_files(target_dir: String) -> Result<Vec<String>, String> {
    let path = Path::new(&target_dir);
    
    if !path.exists() || !path.is_dir() {
        return Err("Invalid target directory".to_string());
    }
    
    let mut images = Vec::new();
    let supported_extensions = vec!["jpg", "jpeg", "png", "raw", "cr2", "crw"];
    
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        if let Some(extension) = entry.path().extension() {
                            if let Some(ext_str) = extension.to_str() {
                                if supported_extensions.contains(&ext_str.to_lowercase().as_str()) {
                                    if let Ok(full_path) = entry.path().into_os_string().into_string() {
                                        images.push(full_path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }
    
    images.sort();
    Ok(images)
}

#[command]
pub fn move_file(source: String, destination: String) -> Result<(), String> {
    let source_path = Path::new(&source);
    let dest_path = Path::new(&destination);
    
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }
    
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create destination directory: {}", e))?;
        }
    }
    
    fs::rename(&source_path, &dest_path)
        .map_err(|e| format!("Failed to move file: {}", e))?;
    
    Ok(())
}

#[command]
pub fn rename_file(file_path: String, new_name: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    if let Some(parent) = path.parent() {
        let new_path = parent.join(&new_name);
        fs::rename(&path, &new_path)
            .map_err(|e| format!("Failed to rename file: {}", e))?;
        Ok(())
    } else {
        Err("Invalid file path".to_string())
    }
}