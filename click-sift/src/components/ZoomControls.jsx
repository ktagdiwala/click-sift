import React from 'react';

export default function ZoomControls({
    imageZoom = 1,
    panX = 0,
    panY = 0,
    keepZoomOnNav = false,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onToggleKeepZoom,
}) {
    return (
        <div className="zoom-controls">
            <button type="button" onClick={onZoomOut} title="Zoom Out (- key)">
                −
            </button>
            <span className="zoom-level">{(imageZoom * 100).toFixed(0)}%</span>
            <button type="button" onClick={onZoomIn} title="Zoom In (+ key)">
                +
            </button>
            <button
                type="button"
                onClick={onResetZoom}
                title="Reset Zoom / Pan (0 key)"
                disabled={imageZoom === 1 && panX === 0 && panY === 0}
                className="reset-zoom-btn"
            >
                ↺
            </button>
            <button
                type="button"
                className={`zoom-toggle-btn ${keepZoomOnNav ? 'active' : ''}`}
                onClick={onToggleKeepZoom}
                title={
                    keepZoomOnNav
                        ? 'Zoom level is locked across photo changes (Click to unlock)'
                        : 'Zoom level resets on photo change (Click to lock zoom)'
                }
            >
                {keepZoomOnNav ? '🔒' : '🔓'}
            </button>
        </div>
    );
}