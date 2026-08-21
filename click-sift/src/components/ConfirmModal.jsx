import React from 'react';

export default function ConfirmModal({ isOpen, hasHistory, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="ps-modal-backdrop" onClick={onCancel}>
            <div className="ps-modal-box" onClick={(e) => e.stopPropagation()}>
                <h3 className="ps-modal-title">Return to Setup?</h3>
                <p className="ps-modal-text">
                    {hasHistory
                        ? "Are you sure you want to go back to setup? Your undo/redo history for this session will be lost."
                        : "Are you sure you want to return to the setup screen?"}
                </p>
                <div className="ps-modal-actions">
                    <button type="button" className="ps-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="ps-btn-confirm" onClick={onConfirm}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}