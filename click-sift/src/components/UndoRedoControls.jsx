import React from 'react';

export default function UndoRedoControls({
    historyCount,
    redoCount,
    onUndo,
    onRedo
}) {
    return (
        <div className="sidebar-section history-section">
            <label className="section-label">History</label>
            <div className="history-buttons-vertical">
                <button
                    type="button"
                    className="btn btn-history"
                    onClick={onUndo}
                    disabled={historyCount === 0}
                    title="Undo last action (Ctrl+Z)"
                >
                    ↶ Undo ({historyCount})
                </button>
                <button
                    type="button"
                    className="btn btn-history"
                    onClick={onRedo}
                    disabled={redoCount === 0}
                    title="Redo action (Ctrl+Y)"
                >
                    ↷ Redo ({redoCount})
                </button>
            </div>
        </div>
    );
}