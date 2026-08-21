// Hook for managing image ratings, including optimistic UI updates and error handling
import { saveImageRating } from '../services/imageService';

export function useImageRating(images, setImages, currentIndex, setError) {
    const handleSetRating = async (newRating) => {
        if (currentIndex < 0 || currentIndex >= images.length) return;

        const item = images[currentIndex];
        const targetRating = (item.rating || 0) === newRating ? 0 : newRating;

        // Optimistically update React UI state
        setImages((prev) =>
            prev.map((img, idx) => (idx === currentIndex ? { ...img, rating: targetRating } : img))
        );

        // Persist to disk via service
        try {
            await saveImageRating(item, targetRating);
        } catch (e) {
            setError(`Failed to save rating to file metadata: ${e}`);
        }
    };

    return { handleSetRating };
}