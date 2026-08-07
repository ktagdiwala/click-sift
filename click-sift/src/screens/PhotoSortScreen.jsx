import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import '../styles/PhotoSortScreen.css';

export default function PhotoSortScreen({ config }) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renameMode, setRenameMode] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const zoomPreviewRef = useRef(null);

  // Load images on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        const imageList = await invoke('get_image_files', {
          targetDir: config.targetDir,
        });
        setImages(imageList);
        if (imageList.length === 0) {
          setError('No supported image files found in the target directory.');
        }
      } catch (e) {
        setError(`Failed to load images: ${e}`);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [config.targetDir]);

  // Initialize rename mode
  useEffect(() => {
    if (images.length > 0) {
      const currentFileName = images[currentIndex];
      setNewFileName(currentFileName);
    }
  }, [currentIndex, images]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (renameMode) return; // Don't process shortcuts while renaming

      switch (e.key.toLowerCase()) {
        case 'k':
          handleKeep();
          break;
        case 'd':
          handleDiscard();
          break;
        case 'arrowright':
          handleNextPhoto();
          break;
        case 'arrowleft':
          handlePreviousPhoto();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images, renameMode]);

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e) => {
      if (!imageRef.current || renameMode) return;

      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setImageZoom((prev) => Math.max(1, Math.min(5, prev * zoomFactor)));
    };

    const imageElement = imageRef.current;
    if (imageElement) {
      imageElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => imageElement.removeEventListener('wheel', handleWheel);
    }
  }, [renameMode]);

  const getCurrentFilePath = useCallback(() => {
    if (images.length === 0) return '';
    return `${config.targetDir}\\${images[currentIndex]}`;
  }, [images, currentIndex, config.targetDir]);

  const handleKeep = async () => {
    if (images.length === 0) return;

    try {
      const source = getCurrentFilePath();
      const destination = `${config.keepDir}\\${images[currentIndex]}`;

      await invoke('move_file', {
        source,
        destination,
      });

      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      const newImages = images.filter((_, i) => i !== currentIndex);
      setImages(newImages);

      if (newImages.length === 0) {
        setError('All photos have been sorted!');
      } else {
        setCurrentIndex(newIndex >= newImages.length ? newImages.length - 1 : newIndex);
        resetZoom();
      }
    } catch (e) {
      setError(`Failed to move file to keep: ${e}`);
    }
  };

  const handleDiscard = async () => {
    if (images.length === 0) return;

    try {
      const source = getCurrentFilePath();
      const destination = `${config.discardDir}\\${images[currentIndex]}`;

      await invoke('move_file', {
        source,
        destination,
      });

      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      const newImages = images.filter((_, i) => i !== currentIndex);
      setImages(newImages);

      if (newImages.length === 0) {
        setError('All photos have been sorted!');
      } else {
        setCurrentIndex(newIndex >= newImages.length ? newImages.length - 1 : newIndex);
        resetZoom();
      }
    } catch (e) {
      setError(`Failed to move file to discard: ${e}`);
    }
  };

  const handleNextPhoto = () => {
    if (images.length === 0) return;
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    resetZoom();
  };

  const handlePreviousPhoto = () => {
    if (images.length === 0) return;
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    resetZoom();
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(5, prev + 0.2));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(1, prev - 0.2));
  };

  const resetZoom = () => {
    setImageZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageZoom > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRenameClick = () => {
    setRenameMode(true);
  };

  const handleRenameSave = async () => {
    if (newFileName === images[currentIndex]) {
      setRenameMode(false);
      return;
    }

    try {
      const oldPath = getCurrentFilePath();
      await invoke('rename_file', {
        filePath: oldPath,
        newName: newFileName,
      });

      const newImages = [...images];
      newImages[currentIndex] = newFileName;
      setImages(newImages);
      setRenameMode(false);
    } catch (e) {
      setError(`Failed to rename file: ${e}`);
    }
  };

  const handleRenameCancel = () => {
    setRenameMode(false);
    setNewFileName(images[currentIndex]);
  };

  if (loading) {
    return (
      <div className="photo-sort-screen">
        <div className="loading">Loading images...</div>
      </div>
    );
  }

  if (error && images.length === 0) {
    return (
      <div className="photo-sort-screen">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="photo-sort-screen">
        <div className="error-message">No images to sort.</div>
      </div>
    );
  }

  const currentFilePath = getCurrentFilePath();
  const imageUrl = convertFileSrc(currentFilePath);

  return (
    <div className="photo-sort-screen">
      {/* Header */}
      <div className="photo-sort-header">
        <div className="file-info">
          {renameMode ? (
            <div className="rename-input-group">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="rename-input"
                autoFocus
              />
              <button className="rename-btn save" onClick={handleRenameSave}>
                Save
              </button>
              <button className="rename-btn cancel" onClick={handleRenameCancel}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="filename-display" onClick={handleRenameClick}>
              <span className="filename">{images[currentIndex]}</span>
              <span className="edit-hint">(Click to rename)</span>
            </div>
          )}
        </div>

        <div className="progress-indicator">
          <span>{currentIndex + 1}</span>
          <span>/</span>
          <span>{images.length}</span>
        </div>
      </div>

      {/* Zoom Preview Strip */}
      <div className="zoom-preview-container">
        <div
          className="zoom-preview"
          ref={zoomPreviewRef}
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: `${(panX / imageRef.current?.offsetWidth) * 100}% ${(panY / imageRef.current?.offsetHeight) * 100}%`,
          }}
        >
          <div
            className="zoom-preview-frame"
            style={{
              width: `${Math.min(100, (1 / imageZoom) * 100)}%`,
              height: `${Math.min(100, (1 / imageZoom) * 100)}%`,
              left: `${Math.max(0, Math.min(100 - (1 / imageZoom) * 100, ((-panX) / imageRef.current?.offsetWidth) * 100))}%`,
              top: `${Math.max(0, Math.min(100 - (1 / imageZoom) * 100, ((-panY) / imageRef.current?.offsetHeight) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Main Image Viewer */}
      <div className="image-viewer-container">
        <button
          className="nav-button prev-button"
          onClick={handlePreviousPhoto}
          title="Previous (← arrow key)"
        >
          ◀
        </button>

        <div
          className="image-display"
          ref={imageRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: imageZoom > 1 ? 'grab' : 'default' }}
        >
          <img
            src={imageUrl}
            alt="Current photo"
            className="photo"
            style={{
              transform: `scale(${imageZoom}) translate(${panX}px, ${panY}px)`,
              cursor: imageZoom > 1 ? 'grabbing' : 'default',
            }}
          />
        </div>

        <button
          className="nav-button next-button"
          onClick={handleNextPhoto}
          title="Next (→ arrow key)"
        >
          ▶
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn btn-keep"
          onClick={handleKeep}
          title="Keep this photo (K key)"
        >
          KEEP
        </button>
        <button
          className="btn btn-discard"
          onClick={handleDiscard}
          title="Discard this photo (D key)"
        >
          DELETE
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={handleZoomOut} title="Zoom Out (- key)">
          −
        </button>
        <span className="zoom-level">{(imageZoom * 100).toFixed(0)}%</span>
        <button onClick={handleZoomIn} title="Zoom In (+ key)">
          +
        </button>
      </div>

      {/* Error Message */}
      {error && error !== 'All photos have been sorted!' && (
        <div className="error-banner">{error}</div>
      )}

      {/* Completion Message */}
      {error === 'All photos have been sorted!' && (
        <div className="completion-banner">{error}</div>
      )}
    </div>
  );
}