import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsModal({ isOpen, onClose }) {
    const { theme, setTheme } = useTheme();

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation(); // Prevents PhotoSortScreen shortcuts from firing
				onClose?.();
			}
		};
	
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

    if (!isOpen) return null;

    const themes = [
        { id: 'dark', label: 'Dark (Default)' },
        { id: 'light', label: 'Light' },
        { id: 'neutral', label: 'Neutral Gray' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>App Settings</h2>
                <div className="setting-group">
                    <label>Theme</label>
                    <div className="theme-options">
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                className={`btn-theme-choice ${theme === t.id ? 'active' : ''}`}
                                onClick={() => setTheme(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="btn btn-close" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}