import React, { useEffect } from 'react';

const LETTER_SHORTCUTS = [
  { key: 'H', label: 'Toggle Shortcuts Help' },
  { key: 'K', label: 'Keep Photo' },
  { key: 'D', label: 'Discard Photo' },
  { key: 'L', label: 'Lock Zoom' },
  { key: 'F', label: 'Toggle Fullscreen' },
  { key: 'R', label: 'Rename Photo' },
];

const NON_LETTER_SHORTCUTS = [
  { key: '0 - 5', label: 'Set Star Rating' },
  { key: '← / →', label: 'Previous / Next' },
  { key: '+ / -', label: 'Zoom In / Out' },
  { key: 'Esc', label: 'Reset Zoom / Close' },
  { key: 'Ctrl + Z', label: 'Undo Action' },
  { key: 'Ctrl + Y', label: 'Redo Action' },
];

export default function ShortcutsHelpModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal-box shortcuts-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h3 className="ps-modal-title">Keyboard Shortcuts</h3>
          <button 
            type="button" 
            className="shortcuts-close-btn" 
            onClick={onClose}
            aria-label="Close shortcuts modal"
          >
            ✕
          </button>
        </div>

        <div className="shortcuts-two-columns">
          <div className="shortcuts-column">
            {LETTER_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="shortcut-row">
                <span className="shortcut-label">{shortcut.label}</span>
                <kbd className="shortcut-key">{shortcut.key}</kbd>
              </div>
            ))}
          </div>

          <div className="shortcuts-column">
            {NON_LETTER_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="shortcut-row">
                <span className="shortcut-label">{shortcut.label}</span>
                <kbd className="shortcut-key">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}