// Service functions for fetching, saving, and renaming images in a directory
import { invoke } from '@tauri-apps/api/core';
import { groupImagePaths } from '../utils/imageUtils';

export async function fetchDirectoryImages(targetDir) {
    const rawList = await invoke('get_image_files', { targetDir });
    const grouped = groupImagePaths(rawList);

    return Promise.all(
        grouped.map(async (group) => {
            const targetPath = group.jpegPath || group.rawPath;
            if (!targetPath) return { ...group, rating: 0 };

            try {
                const rating = await invoke('get_image_rating', { filePath: targetPath });
                return { ...group, rating: rating || 0 };
            } catch {
                return { ...group, rating: 0 };
            }
        })
    );
}

export async function saveImageRating(item, targetRating) {
    const filesToUpdate = [item.jpegPath, item.rawPath].filter(Boolean);
    for (const filePath of filesToUpdate) {
        await invoke('set_image_rating', { filePath, rating: targetRating });
    }
}

export async function renameImageGroup(currentPhoto, updatedName) {
    const separator = currentPhoto.dirPath.includes('\\') ? '\\' : '/';
    const updatedPaths = {};

    for (const { key, path } of [
        { key: 'jpegPath', path: currentPhoto.jpegPath },
        { key: 'rawPath', path: currentPhoto.rawPath },
    ]) {
        if (!path) continue;
        const ext = path.split('.').pop();
        const newName = `${updatedName}.${ext}`;

        await invoke('rename_file', { filePath: path, newName });
        updatedPaths[key] = `${currentPhoto.dirPath}${separator}${newName}`;
    }

    return updatedPaths;
}