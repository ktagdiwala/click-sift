use exif::Reader;
use little_exif::endian::Endian;
use little_exif::exif_tag::ExifTag;
use little_exif::exif_tag_format::ExifTagFormat;
use little_exif::ifd::ExifTagGroup;
use little_exif::metadata::Metadata;
use std::fs::{self, File};
use std::io::BufReader;
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

#[command]
pub fn get_image_files(target_dir: String) -> Result<Vec<String>, String> {
    let path = Path::new(&target_dir);
    
    if !path.exists() || !path.is_dir() {
        return Err("Invalid target directory".to_string());
    }
    
    let mut images = Vec::new();
    let supported_extensions = vec!["jpg", "jpeg", "png", "raw", "cr2", "crw", "CR3", "cr3"];
    
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

#[command]
pub fn get_image_rating(file_path: String) -> u32 {
    let path = Path::new(&file_path);
    let file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return 0,
    };

    let mut bufreader = BufReader::new(file);
    let exif = match Reader::new().read_from_container(&mut bufreader) {
        Ok(e) => e,
        Err(_) => return 0,
    };

    for field in exif.fields() {
        // Tag 0x4746: Standard/Windows EXIF Rating (0 - 5)
        if field.tag.1 == 0x4746 {
            if let Some(val) = field.value.get_uint(0) {
                return val;
            }
        }

        // Tag 0x4749: Windows RatingPercent (0 - 100)
        if field.tag.1 == 0x4749 {
            if let Some(percent) = field.value.get_uint(0) {
                return match percent {
                    1..=12 => 1,
                    13..=37 => 2,
                    38..=62 => 3,
                    63..=87 => 4,
                    88..=100 => 5,
                    _ => 0,
                };
            }
        }
    }

    0
}

// #[command]
// pub fn set_image_rating(file_path: String, rating: u32) -> Result<(), String> {
//     let path = Path::new(&file_path);

//     if !path.exists() {
//         return Err(format!("File does not exist: {}", file_path));
//     }

//     let ext = path
//         .extension()
//         .and_then(|s| s.to_str())
//         .unwrap_or("")
//         .to_lowercase();

//     if !["jpg", "jpeg", "png", "webp"].contains(&ext.as_str()) {
//         return Ok(());
//     }

//     // 1. Calculate Windows percentage value (0, 1, 25, 50, 75, 99)
//     let percent_val: u16 = match rating {
//         1 => 1,
//         2 => 25,
//         3 => 50,
//         4 => 75,
//         5 => 99,
//         _ => 0,
//     };

//     // 2. Update EXIF binary tags using little_exif
//     let mut metadata = Metadata::new_from_path(path).unwrap_or_else(|_| Metadata::new());
//     let endian = metadata.get_endian().clone();

//     let rating_bytes = match endian {
//         Endian::Little => (rating as u16).to_le_bytes().to_vec(),
//         Endian::Big => (rating as u16).to_be_bytes().to_vec(),
//     };

//     let percent_bytes = match endian {
//         Endian::Little => percent_val.to_le_bytes().to_vec(),
//         Endian::Big => percent_val.to_be_bytes().to_vec(),
//     };

//     if let Ok(tag_rating) = ExifTag::from_u16_with_data(
//         0x4746,
//         &ExifTagFormat::INT16U,
//         &rating_bytes,
//         &endian,
//         &ExifTagGroup::GENERIC,
//     ) {
//         metadata.set_tag(tag_rating);
//     }

//     if let Ok(tag_percent) = ExifTag::from_u16_with_data(
//         0x4749,
//         &ExifTagFormat::INT16U,
//         &percent_bytes,
//         &endian,
//         &ExifTagGroup::GENERIC,
//     ) {
//         metadata.set_tag(tag_percent);
//     }

//     let _ = metadata.write_to_file(path);

//     // 3. Patch embedded XMP XML tags using their respective scales
//     if let Ok(mut file_bytes) = fs::read(path) {
//         let xmp_rating_bytes = rating.to_string().into_bytes();           // "0" - "5"
//         let ms_rating_bytes = percent_val.to_string().into_bytes();       // "0" - "99"

//         replace_xmp_tag(&mut file_bytes, b"<xmp:Rating>", b"</xmp:Rating>", &xmp_rating_bytes);
//         replace_xmp_tag(&mut file_bytes, b"<MicrosoftPhoto:Rating>", b"</MicrosoftPhoto:Rating>", &ms_rating_bytes);

//         fs::write(path, file_bytes)
//             .map_err(|e| format!("Failed to save patched XMP rating to {}: {}", file_path, e))?;
//     }

//     Ok(())
// }

// fn replace_xmp_tag(data: &mut Vec<u8>, open_tag: &[u8], close_tag: &[u8], new_val: &[u8]) {
//     let mut i = 0;
//     while i + open_tag.len() <= data.len() {
//         if &data[i..i + open_tag.len()] == open_tag {
//             let val_start = i + open_tag.len();
//             if let Some(offset) = data[val_start..].windows(close_tag.len()).position(|w| w == close_tag) {
//                 let val_end = val_start + offset;
//                 data.splice(val_start..val_end, new_val.iter().cloned());
//                 i = val_start + new_val.len() + close_tag.len();
//                 continue;
//             }
//         }
//         i += 1;
//     }
// }

#[command]
pub fn set_image_rating(file_path: String, rating: u32) -> Result<(), String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !["jpg", "jpeg", "png", "webp"].contains(&ext.as_str()) {
        return Ok(());
    }

    // 1. Read existing Orientation tag (0x0112) to prevent image rotation loss
    let existing_orientation = get_existing_orientation(path);

    // 2. Calculate Windows percentage rating scale (0x4749)
    let percent_val: u16 = match rating {
        1 => 1,
        2 => 25,
        3 => 50,
        4 => 75,
        5 => 99,
        _ => 0,
    };

    // 3. Prepare EXIF metadata container
    let mut metadata = Metadata::new_from_path(path).unwrap_or_else(|_| Metadata::new());
    let endian = metadata.get_endian().clone();

    let rating_bytes = match endian {
        Endian::Little => (rating as u16).to_le_bytes().to_vec(),
        Endian::Big => (rating as u16).to_be_bytes().to_vec(),
    };

    let percent_bytes = match endian {
        Endian::Little => percent_val.to_le_bytes().to_vec(),
        Endian::Big => percent_val.to_be_bytes().to_vec(),
    };

    // Preserve original Orientation tag if one was present
    if let Some(orientation) = existing_orientation {
        let orient_bytes = match endian {
            Endian::Little => orientation.to_le_bytes().to_vec(),
            Endian::Big => orientation.to_be_bytes().to_vec(),
        };
        if let Ok(tag_orient) = ExifTag::from_u16_with_data(
            0x0112,
            &ExifTagFormat::INT16U,
            &orient_bytes,
            &endian,
            &ExifTagGroup::GENERIC,
        ) {
            metadata.set_tag(tag_orient);
        }
    }

    // Set Rating tag (0x4746) and RatingPercent tag (0x4749)
    if let Ok(tag_rating) = ExifTag::from_u16_with_data(
        0x4746,
        &ExifTagFormat::INT16U,
        &rating_bytes,
        &endian,
        &ExifTagGroup::GENERIC,
    ) {
        metadata.set_tag(tag_rating);
    }

    if let Ok(tag_percent) = ExifTag::from_u16_with_data(
        0x4749,
        &ExifTagFormat::INT16U,
        &percent_bytes,
        &endian,
        &ExifTagGroup::GENERIC,
    ) {
        metadata.set_tag(tag_percent);
    }

    let _ = metadata.write_to_file(path);

    // 4. Update embedded XMP XML tags
    if let Ok(mut file_bytes) = fs::read(path) {
        let xmp_rating_bytes = rating.to_string().into_bytes();
        let ms_rating_bytes = percent_val.to_string().into_bytes();

        replace_xmp_tag(&mut file_bytes, b"<xmp:Rating>", b"</xmp:Rating>", &xmp_rating_bytes);
        replace_xmp_tag(&mut file_bytes, b"<MicrosoftPhoto:Rating>", b"</MicrosoftPhoto:Rating>", &ms_rating_bytes);

        fs::write(path, file_bytes)
            .map_err(|e| format!("Failed to save patched XMP rating to {}: {}", file_path, e))?;
    }

    Ok(())
}

// Helper to extract Orientation tag (0x0112) using kamadak-exif reader
fn get_existing_orientation(path: &Path) -> Option<u16> {
    let file = File::open(path).ok()?;
    let mut bufreader = BufReader::new(file);
    let exif = Reader::new().read_from_container(&mut bufreader).ok()?;

    for field in exif.fields() {
        if field.tag.1 == 0x0112 {
            if let Some(val) = field.value.get_uint(0) {
                return Some(val as u16);
            }
        }
    }
    None
}

fn replace_xmp_tag(data: &mut Vec<u8>, open_tag: &[u8], close_tag: &[u8], new_val: &[u8]) {
    let mut i = 0;
    while i + open_tag.len() <= data.len() {
        if &data[i..i + open_tag.len()] == open_tag {
            let val_start = i + open_tag.len();
            if let Some(offset) = data[val_start..].windows(close_tag.len()).position(|w| w == close_tag) {
                let val_end = val_start + offset;
                data.splice(val_start..val_end, new_val.iter().cloned());
                i = val_start + new_val.len() + close_tag.len();
                continue;
            }
        }
        i += 1;
    }
}