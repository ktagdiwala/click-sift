import React from 'react';

export default function ActionControls({
    disabled,
    onKeep,
    onDiscard
}) {
    return (
        <div className="sidebar-section action-section">
            <div className="action-buttons-vertical">
                <button
                    type="button"
                    className="btn btn-keep"
                    onClick={onKeep}
                    disabled={disabled}
                    title="Keep this photo (K key)"
                >
                    KEEP
                </button>
                <button
                    type="button"
                    className="btn btn-discard"
                    onClick={onDiscard}
                    disabled={disabled}
                    title="Discard this photo (D key)"
                >
                    DISCARD
                </button>
            </div>
        </div>
    );
}