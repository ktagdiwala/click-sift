import { useState, useEffect, useCallback, useRef } from 'react';
import { getClampedPan } from '../utils/imageUtils';

export function useImageZoomPan(imageRef, imageElementRef, imageLoaded, stripDimensions = { width: 300, height: 100 }) {
	const [imageZoom, setImageZoom] = useState(1);
	const [panX, setPanX] = useState(0);
	const [panY, setPanY] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	// Add state for cursor position percentages (0 to 100)
	const [hoverCoords, setHoverCoords] = useState({ x: 50, y: 50, bgX: 50, bgY: 50 });
	const [lensSize, setLensSize] = useState({ widthPercent: 20, heightPercent: 20 });
	const [isHovering, setIsHovering] = useState(false);
	// Use a ref for drag start to prevent re-renders during mouse movement
	const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

	const resetZoom = useCallback(() => {
		setImageZoom(1);
		setPanX(0);
		setPanY(0);
	}, []);

	const handleZoomIn = useCallback(() => {
		setImageZoom((prev) => Math.min(5, prev + 0.2));
	}, []);

	const handleZoomOut = useCallback(() => {
		setImageZoom((prev) => {
			const nextZoom = Math.max(1, prev - 0.2);
			if (nextZoom === 1) {
				setPanX(0);
				setPanY(0);
			}
			return nextZoom;
		});
	}, []);

	// Handle Drag Mouse Down
	const handleMouseDown = useCallback((e) => {
		if (imageZoom <= 1) return; // Only drag when zoomed in
		e.preventDefault();
		setIsDragging(true);
		dragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			initialPanX: panX,
			initialPanY: panY,
		};
	}, [imageZoom, panX, panY]);

	// Handle Drag Mouse Move
	const handleMouseMove = useCallback((e) => {
		if (!imageRef.current || !imageElementRef.current) return;
		if (!isHovering) setIsHovering(true);

		// Hover-preview tracking when fully zoomed out (= 1)
		if (imageZoom === 1) {
			const rect = imageElementRef.current.getBoundingClientRect();

			// Mouse coordinates relative to actual rendered <img>
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			// Normalized cursor ratio (0.0 to 1.0)
			const xRatio = Math.max(0, Math.min(1, mouseX / rect.width));
			const yRatio = Math.max(0, Math.min(1, mouseY / rect.height));


			// 1. Calculate how large the background image is rendered inside ZoomStrip (1.5x strip width)
			const ZOOM_FACTOR = 1.5; // The ZoomStrip renders the image at 1.5x its width
			const bgWidthPx = stripDimensions.width * ZOOM_FACTOR;

			// 2. Compute the exact fraction of the original photo that fits across stripDimensions.width
			const visibleWidthFraction = stripDimensions.width / bgWidthPx; // exactly 1 / ZOOM_FACTOR

			// 3. Compute Lens Width percentage relative to the rendered image
			const lWidth = Math.min(100, (visibleWidthFraction * rect.width / rect.width) * 100);

			// 4. Compute Lens Height percentage maintaining exact aspect ratio of the ZoomStrip
			const lHeight = Math.min(100, (stripDimensions.height / bgWidthPx) * (rect.width / rect.height) * 100);

			const halfW = lWidth / 2;
			const halfH = lHeight / 2;

			// Clamp lens center coordinates
			const clampedX = Math.max(halfW, Math.min(100 - halfW, xRatio * 100));
			const clampedY = Math.max(halfH, Math.min(100 - halfH, yRatio * 100));

			setLensSize({ widthPercent: lWidth, heightPercent: lHeight });

			// Calculate bgX and bgY using standard CSS percentage math
			const maxSpanX = 100 - lWidth;
			const maxSpanY = 100 - lHeight;

			const bgX = maxSpanX > 0 ? ((clampedX - halfW) / maxSpanX) * 100 : 50;
			const bgY = maxSpanY > 0 ? ((clampedY - halfH) / maxSpanY) * 100 : 50;

			setHoverCoords({
				x: clampedX,
				y: clampedY,
				bgX: isNaN(bgX) ? 50 : bgX,
				bgY: isNaN(bgY) ? 50 : bgY,
			});
			return;
		}

		// Drag panning logic when zoomed in (> 1)
		if (!isDragging) return;
		e.preventDefault();

		const deltaX = e.clientX - dragStartRef.current.x;
		const deltaY = e.clientY - dragStartRef.current.y;

		const rawX = dragStartRef.current.initialPanX + deltaX;
		const rawY = dragStartRef.current.initialPanY + deltaY;

		const clamped = getClampedPan(rawX, rawY, imageZoom, imageRef, imageElementRef);

		setPanX(clamped.x);
		setPanY(clamped.y);

		// Update hoverCoords directly with clamped percentages
		setHoverCoords({
			x: 50,
			y: 50,
			bgX: clamped.bgX,
			bgY: clamped.bgY,
		});

	}, [isDragging, imageZoom, imageRef, imageElementRef, stripDimensions.width, stripDimensions.height]);

	// Handle Drag Mouse Up
	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseEnter = () => setIsHovering(true);

	// Handle Mouse Leave (Reset magnifier to center when cursor leaves image area)
	const handleMouseLeave = useCallback(() => {
		setIsHovering(false);
		setIsDragging(false);
		// setHoverCoords({ x: 50, y: 50 }); // <--- Resets magnifier back to center
		setHoverCoords({ x: 50, y: 50, bgX: 50, bgY: 50 });
	}, []);

	// Attach Wheel Listener with latest pan/zoom values
	useEffect(() => {
		const handleWheel = (e) => {
			e.preventDefault();
			const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

			if (!imageRef.current) return;
			const rect = imageRef.current.getBoundingClientRect();

			const mouseX = e.clientX - rect.left - rect.width / 2;
			const mouseY = e.clientY - rect.top - rect.height / 2;

			setImageZoom((prevZoom) => {
				const newZoom = Math.min(Math.max(1, prevZoom * zoomFactor), 5);

				if (newZoom > 1) {
					const scaleRatio = newZoom / prevZoom;
					setPanX((prevPanX) => {
						setPanY((prevPanY) => {
							const rawX = mouseX - (mouseX - prevPanX) * scaleRatio;
							const rawY = mouseY - (mouseY - prevPanY) * scaleRatio;
							const clamped = getClampedPan(rawX, rawY, newZoom, imageRef, imageElementRef);

							setHoverCoords({
								x: 50,
								y: 50,
								bgX: clamped.bgX,
								bgY: clamped.bgY,
							});

							// Return updated panY inside callback
							return clamped.y;
						});
						const rawX = mouseX - (mouseX - prevPanX) * scaleRatio;
						const rawY = mouseY - (mouseY - panY) * scaleRatio;
						return getClampedPan(rawX, rawY, newZoom, imageRef, imageElementRef).x;
					});
				} else {
					setPanX(0);
					setPanY(0);
				}

				return newZoom;
			});
		};

		const imageElement = imageRef.current;
		if (imageElement) {
			imageElement.addEventListener('wheel', handleWheel, { passive: false });
			return () => imageElement.removeEventListener('wheel', handleWheel);
		}
	}, [imageRef, imageElementRef, imageLoaded, panY]);

	return {
		imageZoom,
		panX,
		panY,
		hoverCoords,
		lensSize,
		isDragging,
		isHovering,
		handleZoomIn,
		handleZoomOut,
		resetZoom,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseEnter,
		handleMouseLeave,
	};
}