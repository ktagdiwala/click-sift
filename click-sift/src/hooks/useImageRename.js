// Hook for renaming images, including persisting changes to disk and updating UI state
import { renameImageGroup } from '../services/imageService';

export function useImageRename(images, setImages, currentIndex, setError) {
    const handleRenameSave = async (updatedName) => {
        const currentPhoto = images[currentIndex];
        if (!currentPhoto) return;

        try {
            // Persist to disk via service
            const updatedPaths = await renameImageGroup(currentPhoto, updatedName);

            // Update React UI state
            setImages((prev) =>
                prev.map((img, idx) =>
                    idx === currentIndex
                        ? { ...img, baseName: updatedName, ...updatedPaths }
                        : img
                )
            );
        } catch (e) {
            setError(`Failed to rename file group: ${e}`);
        }
    };

    return { handleRenameSave };
}