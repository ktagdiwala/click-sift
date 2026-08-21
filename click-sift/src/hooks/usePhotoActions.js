// functions for handling photo actions: keep, discard, undo, redo

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function usePhotoActions(config, images, setImages, currentIndex, setCurrentIndex, setError) {
    const MAX_HISTORY_LIMIT = 500;
    const [keptCount, setKeptCount] = useState(0);
    const [discardedCount, setDiscardedCount] = useState(0);
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const movePhoto = async (actionType, targetDir) => {
        if (images.length === 0) return;

        try {
            const item = images[currentIndex];
            const separator = item.dirPath?.includes('/') ? '/' : '\\';
            const filesToMove = [item.jpegPath, item.rawPath].filter(Boolean);
            const movedFiles = [];

            for (const filePath of filesToMove) {
                const fileNameWithExt = filePath.split(/[/\\]/).pop();
                const destination = `${targetDir}${separator}${fileNameWithExt}`;

                await invoke('move_file', { source: filePath, destination });
                movedFiles.push({ source: filePath, destination });
            }

            const action = {
                type: actionType,
                item,
                movedFiles,
                originalIndex: currentIndex,
            };

            setHistory((prev) => [...prev, action].slice(-MAX_HISTORY_LIMIT));
            setRedoStack([]);

            if (actionType === 'keep') setKeptCount((prev) => prev + 1);
            else setDiscardedCount((prev) => prev + 1);

            const newIndex = currentIndex < images.length - 1 ? currentIndex : 0;
            const newImages = images.filter((_, i) => i !== currentIndex);
            setImages(newImages);

            if (newImages.length === 0) {
                setError('All photos have been sorted!');
            } else {
                setCurrentIndex(newIndex >= newImages.length ? newImages.length - 1 : newIndex);
            }
        } catch (e) {
            setError(`Failed to move file to ${actionType}: ${e}`);
        }
    };

    const handleKeep = () => movePhoto('keep', config.keepDir);
    const handleDiscard = () => movePhoto('discard', config.discardDir);

    const handleUndo = async () => {
        if (history.length === 0) return;
        const lastAction = history[history.length - 1];

        try {
            const filesToUndo = lastAction.movedFiles || [{ source: lastAction.source, destination: lastAction.destination }];

            for (const file of filesToUndo) {
                await invoke('move_file', { source: file.destination, destination: file.source });
            }

            const updatedImages = [...images];
            const itemToRestore = lastAction.item || lastAction.source;
            updatedImages.splice(lastAction.originalIndex, 0, itemToRestore);

            setImages(updatedImages);
            setCurrentIndex(lastAction.originalIndex);

            if (lastAction.type === 'keep') setKeptCount((prev) => Math.max(0, prev - 1));
            else setDiscardedCount((prev) => Math.max(0, prev - 1));

            setHistory((prev) => prev.slice(0, -1));
            setRedoStack((prev) => [...prev, lastAction]);
            setError('');
        } catch (e) {
            setError(`Failed to undo action: ${e}`);
        }
    };

    const handleRedo = async () => {
        if (redoStack.length === 0) return;
        const nextAction = redoStack[redoStack.length - 1];

        try {
            const filesToRedo = nextAction.movedFiles || [{ source: nextAction.source, destination: nextAction.destination }];

            for (const file of filesToRedo) {
                await invoke('move_file', { source: file.source, destination: file.destination });
            }

            const targetItem = nextAction.item || nextAction.source;
            const updatedImages = images.filter((img) => img !== targetItem);

            setImages(updatedImages);

            if (nextAction.type === 'keep') setKeptCount((prev) => prev + 1);
            else setDiscardedCount((prev) => prev + 1);

            if (updatedImages.length === 0) {
                setError('All photos have been sorted!');
            } else {
                setCurrentIndex((prev) => (prev >= updatedImages.length ? updatedImages.length - 1 : prev));
            }

            setRedoStack((prev) => prev.slice(0, -1));
            setHistory((prev) => [...prev, nextAction].slice(-MAX_HISTORY_LIMIT));
        } catch (e) {
            setError(`Failed to redo action: ${e}`);
        }
    };

    return {
        handleKeep,
        handleDiscard,
        handleUndo,
        handleRedo,
        history,
        redoStack,
        keptCount,
        discardedCount,
    };
}