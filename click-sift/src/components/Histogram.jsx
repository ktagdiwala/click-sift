import React, { useEffect, useRef } from 'react';

export default function Histogram({ src }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!src) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // 1. Draw image to an offscreen canvas for sampling
            const offscreen = document.createElement('canvas');
            // Downscale for faster performance (e.g., max width 300px)
            const scale = Math.min(1, 300 / img.width);
            offscreen.width = img.width * scale;
            offscreen.height = img.height * scale;
            
            const offCtx = offscreen.getContext('2d');
            offCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

            const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
            const pixels = imageData.data;

            // 2. Initialize 256 bins for RGB / Lightness
            const rBins = new Array(256).fill(0);
            const gBins = new Array(256).fill(0);
            const bBins = new Array(256).fill(0);

            for (let i = 0; i < pixels.length; i += 4) {
                rBins[pixels[i]]++;
                gBins[pixels[i + 1]]++;
                bBins[pixels[i + 2]]++;
            }

            // Find maximum count to normalize peak height
            const maxCount = Math.max(...rBins, ...gBins, ...bBins);

            // 3. Render channels to the visible canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'screen'; // Blend RGB colors nicely

            const drawChannel = (bins, color) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height);

                for (let i = 0; i < 256; i++) {
                    const x = (i / 255) * canvas.width;
                    const height = (bins[i] / maxCount) * canvas.height;
                    const y = canvas.height - height;
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(canvas.width, canvas.height);
                ctx.closePath();
                ctx.fill();
            };

            drawChannel(rBins, 'rgba(239, 68, 68, 0.6)');   // Red
            drawChannel(gBins, 'rgba(34, 197, 94, 0.6)');   // Green
            drawChannel(bBins, 'rgba(59, 130, 246, 0.6)');  // Blue
        };
    }, [src]);

    return (
        <canvas
            ref={canvasRef}
            width={256}
            height={256}
            style={{ width: '100%', height: '100px', borderRadius: '4px', backgroundColor: '#0f172a' }}
        />
    );
}