import { useEffect } from 'react';

export function useShortcuts(handlers, dependencies = []) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const isCmdOrCtrl = e.metaKey || e.ctrlKey;

            // Undo / Redo
            if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                return handlers.onUndo?.();
            }
            if ((isCmdOrCtrl && e.key.toLowerCase() === 'y') || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                return handlers.onRedo?.();
            }

            // Numeric ratings (0-5)
            if (['0', '1', '2', '3', '4', '5'].includes(e.key)) {
                return handlers.onSetRating?.(parseInt(e.key, 10));
            }

            switch (e.key.toLowerCase()) {
                case 'k': handlers.onKeep?.(); break;
                case 'd': handlers.onDiscard?.(); break;
                case 'arrowright': handlers.onNext?.(); break;
                case 'arrowleft': handlers.onPrevious?.(); break;
                case '+':
                case '=': handlers.onZoomIn?.(); break;
                case '-': handlers.onZoomOut?.(); break;
                case 'escape': handlers.onResetZoom?.(); break;
                case 'r':
                    e.preventDefault();
                    handlers.onOpenRename?.();
                    break;
                case 'l': handlers.onToggleLockZoom?.(); break;
				case 'f': handlers.onToggleFullscreen?.(); break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, dependencies);
}