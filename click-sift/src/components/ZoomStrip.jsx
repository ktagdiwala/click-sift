import React, { useState, useEffect } from 'react';

export default function ZoomPreviewStrip({
	imageUrl,
	imageLoaded,
	zoomPreviewRef,
	imageZoom = 1,
	hoverCoords = { x: 50, y: 50, bgX: 50, bgY: 50 },
	onDimensionsChange,
}) {
	const [stripHeight, setStripHeight] = useState(100);

	// Notify parent of container size for dynamic lens sizing
	useEffect(() => {
		if (zoomPreviewRef?.current && onDimensionsChange) {
			const rect = zoomPreviewRef.current.getBoundingClientRect();
			onDimensionsChange({ width: rect.width, height: rect.height });
		}
	}, [stripHeight, zoomPreviewRef, onDimensionsChange]);

	const handleResizeMouseDown = (e) => {
		e.preventDefault();
		const startY = e.clientY;
		const startHeight = stripHeight;

		const onMouseMove = (moveEvent) => {
			const deltaY = moveEvent.clientY - startY;
			const newHeight = Math.min(Math.max(0, startHeight + deltaY), 800);
			setStripHeight(newHeight);
		};

		const onMouseUp = () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	};

	const scaleFactor = 1.5 * imageZoom; // 1.5x zoom for the strip

	return (
		<div
			className="zoom-preview-container"
			style={{ height: `${stripHeight}px` }}
		>
			<div
				className="zoom-preview"
				ref={zoomPreviewRef}
				style={{
					backgroundImage: imageLoaded ? `url(${imageUrl})` : 'none',
					backgroundSize: `${scaleFactor * 100}% auto`,
					backgroundPosition: `${hoverCoords.bgX}% ${hoverCoords.bgY}%`,
					backgroundRepeat: 'no-repeat',
				}}
			/>
			<div
				className="zoom-strip-resize-handle"
				onMouseDown={handleResizeMouseDown}
				title="Drag to resize strip"
			/>
		</div>
	);
}