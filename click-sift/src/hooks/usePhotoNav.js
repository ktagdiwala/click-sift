import { useState, useEffect, useRef } from 'react';

export function usePhotoNav(images, keepZoomOnNav, resetZoom, setImageLoaded) {
	const [currentIndex, setCurrentIndex] = useState(0);

	const currentPhotoPath = images[currentIndex]?.jpegPath || images[currentIndex]?.rawPath;
	const prevPhotoPathRef = useRef(currentPhotoPath);

	// Handle Reset Zoom on photo change
	useEffect(() => {
		if (currentPhotoPath && currentPhotoPath !== prevPhotoPathRef.current) {
			if (setImageLoaded) setImageLoaded(false);
			if (!keepZoomOnNav) {
				resetZoom();
			}
			prevPhotoPathRef.current = currentPhotoPath;
		}
	}, [currentIndex, currentPhotoPath, keepZoomOnNav, resetZoom, setImageLoaded]);

	const handleNextPhoto = () => {
		if (images.length === 0) return;
		setCurrentIndex((prev) => (prev + 1) % images.length);
	};

	const handlePreviousPhoto = () => {
		if (images.length === 0) return;
		setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
	};

	return {
		currentIndex,
		setCurrentIndex,
		handleNextPhoto,
		handlePreviousPhoto,
	};
}