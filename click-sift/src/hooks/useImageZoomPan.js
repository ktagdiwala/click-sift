import { useState, useEffect, useCallback, useRef } from 'react';
import { getClampedPan } from '../utils/imageUtils';

export function useImageZoomPan(imageRef, imageElementRef, imageLoaded) {
    const [imageZoom, setImageZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    
    // Use a ref for drag start to prevent re-renders during mouse movement
    const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

    const resetZoom = useCallback(() => {
        setImageZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    const handleZoomIn = useCallback(() => {
        setImageZoom((prev) => Math.min(5, prev + 0.2));
    }, []);

    const handleZoomOut = useCallback(() => {
        setImageZoom((prev) => {
            const nextZoom = Math.max(1, prev - 0.2);
            if (nextZoom === 1) {
                setPanX(0);
                setPanY(0);
            }
            return nextZoom;
        });
    }, []);

    // Handle Drag Mouse Down
    const handleMouseDown = useCallback((e) => {
        if (imageZoom <= 1) return; // Only drag when zoomed in
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialPanX: panX,
            initialPanY: panY,
        };
    }, [imageZoom, panX, panY]);

    // Handle Drag Mouse Move
    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const rawX = dragStartRef.current.initialPanX + deltaX;
        const rawY = dragStartRef.current.initialPanY + deltaY;

        const clamped = getClampedPan(rawX, rawY, imageZoom, imageRef, imageElementRef);

        setPanX(clamped.x);
        setPanY(clamped.y);
    }, [isDragging, imageZoom, imageRef, imageElementRef]);

    // Handle Drag Mouse Up
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Attach Wheel Listener with latest pan/zoom values
    useEffect(() => {
        const handleWheel = (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

            if (!imageRef.current) return;
            const rect = imageRef.current.getBoundingClientRect();

            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;

            setImageZoom((prevZoom) => {
                const newZoom = Math.min(Math.max(1, prevZoom * zoomFactor), 5);

                if (newZoom > 1) {
                    const scaleRatio = newZoom / prevZoom;
                    setPanX((prevPanX) => {
                        setPanY((prevPanY) => {
                            const rawX = mouseX - (mouseX - prevPanX) * scaleRatio;
                            const rawY = mouseY - (mouseY - prevPanY) * scaleRatio;
                            const clamped = getClampedPan(rawX, rawY, newZoom, imageRef, imageElementRef);
                            
                            // Return updated panY inside callback
                            return clamped.y;
                        });
                        const rawX = mouseX - (mouseX - prevPanX) * scaleRatio;
                        const rawY = mouseY - (mouseY - panY) * scaleRatio;
                        return getClampedPan(rawX, rawY, newZoom, imageRef, imageElementRef).x;
                    });
                } else {
                    setPanX(0);
                    setPanY(0);
                }

                return newZoom;
            });
        };

        const imageElement = imageRef.current;
        if (imageElement) {
            imageElement.addEventListener('wheel', handleWheel, { passive: false });
            return () => imageElement.removeEventListener('wheel', handleWheel);
        }
    }, [imageRef, imageElementRef, imageLoaded, panY]);

    return {
        imageZoom,
        panX,
        panY,
        isDragging,
        handleZoomIn,
        handleZoomOut,
        resetZoom,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    };
}