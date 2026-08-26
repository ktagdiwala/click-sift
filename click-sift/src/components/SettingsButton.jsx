import React, { useState } from 'react';
import SettingsModal from './SettingsModal';

export default function SettingsButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                className="btn-settings-trigger"
                onClick={() => setIsOpen(true)}
                title="Settings"
            >
                ⚙️
            </button>
            <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}