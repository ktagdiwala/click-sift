// Functions for grouping image paths and clamping pan values for image zooming.

export const groupImagePaths = (filePaths) => {
    const groups = new Map();

    filePaths.forEach((filePath) => {
        const separator = filePath.includes('\\') ? '\\' : '/';
        const fileName = filePath.split(separator).pop();
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return;

        const baseName = fileName.substring(0, lastDotIndex);
        const ext = fileName.substring(lastDotIndex + 1).toLowerCase();
        const dirPath = filePath.substring(0, filePath.lastIndexOf(separator));

        if (!groups.has(baseName)) {
            groups.set(baseName, {
                id: baseName,
                baseName,
                dirPath,
                rawPath: null,
                jpegPath: null,
            });
        }

        const group = groups.get(baseName);
        if (ext === 'cr3') {
            group.rawPath = filePath;
        } else {
            group.jpegPath = filePath;
        }
    });

    return Array.from(groups.values());
};

export const getClampedPan = (x, y, zoom, imageRef, imageElementRef) => {
    // Ensure refs and their .current DOM elements exist
    const container = imageRef?.current;
    const img = imageElementRef?.current;

    if (!container || !img || zoom <= 1) {
        return { x: 0, y: 0 };
    }

    // Container viewport dimensions
    const boxWidth = container.clientWidth;
    const boxHeight = container.clientHeight;

    // Rendered image dimensions
    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;

    // Calculate maximum allowed pan offset in each direction
    const maxPanX = Math.max(0, (imgWidth * zoom - boxWidth) / 2);
    const maxPanY = Math.max(0, (imgHeight * zoom - boxHeight) / 2);

    return {
        x: Math.min(maxPanX, Math.max(-maxPanX, x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    };
};

