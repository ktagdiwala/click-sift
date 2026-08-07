use std::fs;
use std::path::Path;
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