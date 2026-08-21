import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const FileInfo = forwardRef(({ currentPhoto, disabled, onRenameSave }, ref) => {
    const [renameMode, setRenameMode] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    useEffect(() => {
        if (currentPhoto) {
            setNewFileName(currentPhoto.baseName || '');
            setRenameMode(false);
        }
    }, [currentPhoto]);

    // Expose openRename so parent can trigger rename mode via hotkey 'R'
    useImperativeHandle(ref, () => ({
        openRename: () => {
            if (!disabled) {
                setRenameMode(true);
            }
        }
    }));

    const submitRename = () => {
        if (newFileName && newFileName !== currentPhoto?.baseName) {
            onRenameSave(newFileName);
        }
        setRenameMode(false);
    };

    const handleCancel = () => {
        setRenameMode(false);
        setNewFileName(currentPhoto?.baseName || '');
    };

    const handleInputKeyDown = (e) => {
        // Prevent keypresses (like R, K, D) from leaking to global shortcuts while typing
        e.stopPropagation();

        if (e.key === 'Enter') {
            e.preventDefault();
            submitRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    return (
        <div className="sidebar-section file-section">
            <label className="section-label">Current File</label>
            {renameMode ? (
                <div className="rename-input-group">
                    <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="rename-input"
                        autoFocus
                    />
                    <button type="button" className="rename-btn save" onClick={submitRename}>
                        Save
                    </button>
                    <button type="button" className="rename-btn cancel" onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            ) : (
                <div
                    className={`filename-display ${disabled ? 'disabled' : ''}`}
                    onClick={!disabled ? () => setRenameMode(true) : undefined}
                >
                    <div className="filename-header">
                        <span className="filename">{currentPhoto?.baseName || ''}</span>
                        {currentPhoto?.rawPath && (
                            <span className="raw-badge" title="RAW file detected for this photo">
                                [has RAW]
                            </span>
                        )}
                    </div>
                    {!disabled && <span className="edit-hint">Click to rename (or press R)</span>}
                </div>
            )}
        </div>
    );
});

export default FileInfo;