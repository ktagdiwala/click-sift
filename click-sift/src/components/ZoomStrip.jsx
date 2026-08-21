import React, { useState } from 'react';

export default function ZoomPreviewStrip({
    imageUrl,
    imageLoaded,
    naturalSize,
    panX,
    panY,
    zoomPreviewRef,
}) {
    const [stripHeight, setStripHeight] = useState(100);

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
                    backgroundSize: naturalSize.width ? `${naturalSize.width}px ${naturalSize.height}px` : 'cover',
                    backgroundPosition: `calc(50% + ${panX}px) calc(50% + ${panY}px)`,
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