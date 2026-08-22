import React, { useState, useEffect } from 'react';

export default function ZoomPreviewStrip({
	imageUrl,
	imageLoaded,
	naturalSize,
	panX,
	panY,
	zoomPreviewRef,
	imageZoom = 1,
	lensSize = { widthPercent: 20, heightPercent: 20 },
	hoverCoords = { x: 50, y: 50 },
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
					backgroundSize: imageZoom === 1
						? '250% auto' // Locked to 250% width scale
						: (naturalSize.width ? `${naturalSize.width}px ${naturalSize.height}px` : 'cover'),
					backgroundPosition: imageZoom === 1
						? `${hoverCoords.bgX}% ${hoverCoords.bgY}%`
						: `calc(50% + ${panX}px) calc(50% + ${panY}px)`,
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