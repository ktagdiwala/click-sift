import React, { useState, useEffect } from 'react';

export default function ZoomPreviewStrip({
	imageUrl,
	imageLoaded,
	zoomPreviewRef,
	imageZoom = 1,
	hoverCoords = { x: 50, y: 50, bgX: 50, bgY: 50 },
	onDimensionsChange,
	stripDimensions,
}) {
	// const [stripHeight, setStripHeight] = useState(100);

	// Notify parent of container size for dynamic lens sizing
	useEffect(() => {
		if (zoomPreviewRef?.current && onDimensionsChange) {
			const rect = zoomPreviewRef.current.getBoundingClientRect();
			onDimensionsChange({ width: rect.width, height: rect.height });
		}
	}, [zoomPreviewRef, onDimensionsChange]);

	const handleResizeMouseDown = (e) => {
		e.preventDefault();
		const startY = e.clientY;
		const startHeight = stripDimensions.height;

		const onMouseMove = (moveEvent) => {
			const deltaY = moveEvent.clientY - startY;
			const newHeight = Math.min(Math.max(0, startHeight + deltaY), 800);
			onDimensionsChange({ width: stripDimensions.width, height: newHeight });
		};

		const onMouseUp = () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	};

	const scaleFactor = 1.5 * imageZoom; // 1.5x zoom for the strip
	const isHidden = stripDimensions.height === 0;

	return (
		<div
			className="zoom-preview-container"
			style={{ 
				height: `${stripDimensions.height}px`,
				display: isHidden ? 'none' : 'flex' // Cleanly hide container when 0px
			}}
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