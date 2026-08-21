// Loads images from a specified directory and manages the loading state and error handling
import { useState, useEffect } from 'react';
import { fetchDirectoryImages } from '../services/imageService';

export function useImageLoader(targetDir, setError) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                const loadedImages = await fetchDirectoryImages(targetDir);
                if (isMounted) {
                    setImages(loadedImages);
                    if (loadedImages.length === 0) {
                        setError('No supported image files found in the target directory.');
                    }
                }
            } catch (e) {
                if (isMounted) setError(`Failed to load images: ${e}`);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (targetDir) load();

        return () => { isMounted = false; };
    }, [targetDir, setError]);

    return { images, setImages, loading };
}