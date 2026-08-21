import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import ZoomStrip from '../components/ZoomStrip';
import FileInfo from '../components/FileInfo';
import Navigation from '../components/Navigation';
import Histogram from '../components/Histogram';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/PhotoSortScreen.css';

const groupImagePaths = (filePaths) => {
	const groups = new Map();

	filePaths.forEach((filePath) => {
		// Extract filename and directory separator
		const separator = filePath.includes('\\') ? '\\' : '/';
		const fileName = filePath.split(separator).pop();
		const lastDotIndex = fileName.lastIndexOf('.');
		if (lastDotIndex === -1) return;

		const baseName = fileName.substring(0, lastDotIndex);
		const ext = fileName.substring(lastDotIndex + 1).toLowerCase();
		const dirPath = filePath.substring(0, filePath.lastIndexOf(separator));

		if (!groups.has(baseName)) {
			groups.set(baseName, {
				id: baseName,
				baseName: baseName,
				dirPath: dirPath,
				rawPath: null,    // Full path to .CR3
				jpegPath: null,   // Full path to .JPG/.JPEG
			});
		}

		const group = groups.get(baseName);
		if (ext === 'cr3') {
			group.rawPath = filePath;
		} else {
			group.jpegPath = filePath;
		}
	});

	return Array.from(groups.values());
};

export default function PhotoSortScreen({ config, onBackToSetup }) {
	const MAX_HISTORY_LIMIT = 500;
	const [keptCount, setKeptCount] = useState(0);
	const [discardedCount, setDiscardedCount] = useState(0);
	const [images, setImages] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [imageZoom, setImageZoom] = useState(1);
	const [panX, setPanX] = useState(0);
	const [panY, setPanY] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
	const [imageLoaded, setImageLoaded] = useState(false);
	const imageRef = useRef(null);
	const imageElementRef = useRef(null);
	const zoomPreviewRef = useRef(null);
	const [history, setHistory] = useState([]);  // Stores the last keep/delete actions for undoing
	const [redoStack, setRedoStack] = useState([]);	// Stores last actions for redoing
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const fileInfoRef = useRef(null);


	// Load images on mount
	useEffect(() => {
		const loadImages = async () => {
			try {
				setLoading(true);
				setKeptCount(0);      // Reset counters for new directory
				setDiscardedCount(0); // Reset counters for new directory

				const imageList = await invoke('get_image_files', {
					targetDir: config.targetDir,
				});

				// Group RAW and JPEG paths together
				const groupedImages = groupImagePaths(imageList);

				// Fetch initial ratings from EXIF metadata for each image
				const imagesWithRatings = await Promise.all(
					groupedImages.map(async (group) => {
						const targetPath = group.jpegPath || group.rawPath;
						if (!targetPath) return { ...group, rating: 0 };

						try {
							const rating = await invoke('get_image_rating', { filePath: targetPath });
							return { ...group, rating: rating || 0 };
						} catch (e) {
							console.error('Failed to read rating for', targetPath, e);
							return { ...group, rating: 0 };
						}
					})
				);
				setImages(imagesWithRatings);

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

	// Rating handler function
	const handleSetRating = async (newRating) => {
		if (currentIndex < 0 || currentIndex >= images.length) return;

		const item = images[currentIndex];
		const currentRating = item.rating || 0;
		const targetRating = currentRating === newRating ? 0 : newRating;

		// Optimistically update React UI state
		const updatedImages = [...images];
		updatedImages[currentIndex] = { ...item, rating: targetRating };
		setImages(updatedImages);

		// Persist updated rating to both JPEG and RAW files on disk
		try {
			const filesToUpdate = [item.jpegPath, item.rawPath].filter(Boolean);
			for (const filePath of filesToUpdate) {
				await invoke('set_image_rating', {
					filePath,
					rating: targetRating,
				});
			}
		} catch (e) {
			setError(`Failed to save rating to file metadata: ${e}`);
		}
	};

	// Initialize rename mode
	useEffect(() => {
		if (images.length > 0 && images[currentIndex]) {
			setImageLoaded(false);
			resetZoom();
		}
	}, [currentIndex, images]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
				return;
			}

			const isCmdOrCtrl = e.metaKey || e.ctrlKey;

			// Undo: Ctrl+Z or Cmd+Z
			if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
				e.preventDefault();
				handleUndo();
				return;
			}

			// Redo: Ctrl+Y or Cmd+Shift+Z
			if (
				(isCmdOrCtrl && e.key.toLowerCase() === 'y') ||
				(isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
			) {
				e.preventDefault();
				handleRedo();
				return;
			}

			if (['0', '1', '2', '3', '4', '5'].includes(e.key)) {
				handleSetRating(parseInt(e.key, 10));
			}

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
				case 'escape':
					resetZoom();
					break;
				case 'r':
					e.preventDefault();
					fileInfoRef.current?.openRename();
					break;
				default:
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [currentIndex, images, history, redoStack]);


	// Handle mouse wheel zoom
	useEffect(() => {
		const handleWheel = (e) => {
			e.preventDefault();
			const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
			const newZoom = Math.min(Math.max(1, imageZoom * zoomFactor), 5);

			if (!imageRef.current) return;
			const rect = imageRef.current.getBoundingClientRect();

			// Cursor position relative to viewer container center
			const mouseX = e.clientX - rect.left - rect.width / 2;
			const mouseY = e.clientY - rect.top - rect.height / 2;

			// Adjust pan so the point under the cursor stays still
			if (newZoom > 1) {
				const scaleRatio = newZoom / imageZoom;
				const rawX = mouseX - (mouseX - panX) * scaleRatio;
				const rawY = mouseY - (mouseY - panY) * scaleRatio;

				// Clamp pan during wheel zoom
				const clamped = getClampedPan(rawX, rawY, newZoom);
				setPanX(clamped.x);
				setPanY(clamped.y);
			} else {
				// Reset pan if zoomed out to normal
				setPanX(0);
				setPanY(0);
			}

			setImageZoom(newZoom);
		};

		const imageElement = imageRef.current;
		if (imageElement) {
			imageElement.addEventListener('wheel', handleWheel, { passive: false });
			return () => imageElement.removeEventListener('wheel', handleWheel);
		}
	}, [imageZoom, panX, panY, imageLoaded]);

	const handleKeep = async () => {
		if (images.length === 0) return;

		try {
			// Updated for grouped jpeg/raw
			const item = images[currentIndex];
			const separator = item.dirPath?.includes('/') ? '/' : '\\';
			const filesToMove = [item.jpegPath, item.rawPath].filter(Boolean);
			const movedFiles = [];

			for (const filePath of filesToMove) {
				const fileNameWithExt = filePath.split(/[/\\]/).pop();
				const destination = `${config.keepDir}${separator}${fileNameWithExt}`;

				await invoke('move_file', {
					source: filePath,
					destination,
				});

				movedFiles.push({ source: filePath, destination });
			}

			// Track action in history stack & clear redo stack
			const action = {
				type: 'keep',
				item,
				movedFiles,
				originalIndex: currentIndex,
			};

			setHistory((prev) => [...prev, action].slice(-MAX_HISTORY_LIMIT));
			setRedoStack([]);

			// Update counters
			setKeptCount((prev) => prev + 1);

			const newIndex = currentIndex < images.length - 1 ? currentIndex : 0;
			const newImages = images.filter((_, i) => i !== currentIndex);
			setImages(newImages);

			if (newImages.length === 0) {
				setError('All photos have been sorted!');
			} else {
				setCurrentIndex(newIndex >= newImages.length ? newImages.length - 1 : newIndex);
			}
		} catch (e) {
			setError(`Failed to move file to keep: ${e}`);
		}
	};

	const handleDiscard = async () => {
		if (images.length === 0) return;

		try {
			// Updated for grouped jpeg/raw
			const item = images[currentIndex];
			const separator = item.dirPath?.includes('/') ? '/' : '\\';
			const filesToMove = [item.jpegPath, item.rawPath].filter(Boolean);
			const movedFiles = [];

			for (const filePath of filesToMove) {
				const fileNameWithExt = filePath.split(/[/\\]/).pop();
				const destination = `${config.discardDir}${separator}${fileNameWithExt}`;

				await invoke('move_file', {
					source: filePath,
					destination,
				});

				movedFiles.push({ source: filePath, destination });
			}

			// Track action in history stack & clear redo stack
			const action = {
				type: 'discard',
				item,
				movedFiles,
				originalIndex: currentIndex,
			};

			setHistory((prev) => [...prev, action].slice(-MAX_HISTORY_LIMIT));
			setRedoStack([]);

			// update counters
			setDiscardedCount((prev) => prev + 1);

			const newIndex = currentIndex < images.length - 1 ? currentIndex : 0;
			const newImages = images.filter((_, i) => i !== currentIndex);
			setImages(newImages);

			if (newImages.length === 0) {
				setError('All photos have been sorted!');
			} else {
				setCurrentIndex(newIndex >= newImages.length ? newImages.length - 1 : newIndex);
			}
		} catch (e) {
			setError(`Failed to move file to discard: ${e}`);
		}
	};

	const handleUndo = async () => {
		if (history.length === 0) return;

		const lastAction = history[history.length - 1];

		try {
			// Updated for grouped jpeg/raw
			const filesToUndo = lastAction.movedFiles || [{ source: lastAction.source, destination: lastAction.destination }];

			for (const file of filesToUndo) {
				await invoke('move_file', {
					source: file.destination,
					destination: file.source,
				});
			}

			const updatedImages = [...images];
			const itemToRestore = lastAction.item || lastAction.source;
			updatedImages.splice(lastAction.originalIndex, 0, itemToRestore);

			setImages(updatedImages);
			setCurrentIndex(lastAction.originalIndex);

			// Decrement the corresponding counter
			if (lastAction.type === 'keep') {
				setKeptCount((prev) => Math.max(0, prev - 1));
			} else {
				setDiscardedCount((prev) => Math.max(0, prev - 1));
			}

			// Pop from history, push to redo
			setHistory((prev) => prev.slice(0, -1));
			setRedoStack((prev) => [...prev, lastAction]);
			setError(''); // Clear error/completion banner if returning from finished screen
		} catch (e) {
			setError(`Failed to undo action: ${e}`);
		}
	};

	const handleRedo = async () => {
		if (redoStack.length === 0) return;

		const nextAction = redoStack[redoStack.length - 1];

		try {
			// Updated for grouped jpeg/raw
			const filesToRedo = nextAction.movedFiles || [{ source: nextAction.source, destination: nextAction.destination }];

			for (const file of filesToRedo) {
				// Re-apply move action
				await invoke('move_file', {
					source: file.source,
					destination: file.destination,
				});
			}

			const targetItem = nextAction.item || nextAction.source;
			// Remove file from list again
			const updatedImages = images.filter((img) => img !== targetItem);

			setImages(updatedImages);

			if (nextAction.type === 'keep') {
				setKeptCount((prev) => prev + 1);
			} else {
				setDiscardedCount((prev) => prev + 1);
			}

			// Safeguard index position
			if (updatedImages.length === 0) {
				setError('All photos have been sorted!');
			} else {
				setCurrentIndex((prev) => (prev >= updatedImages.length ? updatedImages.length - 1 : prev));
			}

			// Pop from redo, push to history
			setRedoStack((prev) => prev.slice(0, -1));
			setHistory((prev) => [...prev, nextAction].slice(-MAX_HISTORY_LIMIT));
		} catch (e) {
			setError(`Failed to redo action: ${e}`);
		}
	};

	const handleNextPhoto = () => {
		if (images.length === 0) return;
		const nextIndex = (currentIndex + 1) % images.length;
		setCurrentIndex(nextIndex);
	};

	const handlePreviousPhoto = () => {
		if (images.length === 0) return;
		const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
		setCurrentIndex(prevIndex);
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

	const getClampedPan = (x, y, zoom) => {
		if (!imageRef.current || !imageElementRef.current || zoom <= 1) {
			return { x: 0, y: 0 };
		}

		// Container viewport dimensions
		const boxWidth = imageRef.current.clientWidth;
		const boxHeight = imageRef.current.clientHeight;

		// Rendered image dimensions
		const imgWidth = imageElementRef.current.offsetWidth;
		const imgHeight = imageElementRef.current.offsetHeight;

		// Calculate maximum allowed unscaled pan offset in each direction
		const maxPanX = Math.max(0, (imgWidth * zoom - boxWidth) / (2));
		const maxPanY = Math.max(0, (imgHeight * zoom - boxHeight) / (2));

		return {
			x: Math.min(maxPanX, Math.max(-maxPanX, x)),
			y: Math.min(maxPanY, Math.max(-maxPanY, y)),
		};
	};

	const handleMouseDown = (e) => {
		if (imageZoom <= 1) return; // Only allow drag when zoomed in
		e.preventDefault();
		setIsDragging(true);
		setDragStart({
			x: e.clientX,
			y: e.clientY,
			initialPanX: panX,
			initialPanY: panY
		});
	};

	const handleMouseMove = (e) => {
		if (!isDragging) return;
		e.preventDefault();

		// Calculate distance moved from initial click position
		const deltaX = e.clientX - dragStart.x;
		const deltaY = e.clientY - dragStart.y;

		const rawX = dragStart.initialPanX + deltaX;
		const rawY = dragStart.initialPanY + deltaY;

		// Clamp pan so edges stay inside viewer bounds
		const clamped = getClampedPan(rawX, rawY, imageZoom);

		setPanX(clamped.x);
		setPanY(clamped.y);
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleRenameSave = async (updatedName) => {
		if (!currentPhoto) return;

		try {
			const separator = currentPhoto.dirPath.includes('\\') ? '\\' : '/';
			const updatedPaths = {};

			for (const { key, path } of [
				{ key: 'jpegPath', path: currentPhoto.jpegPath },
				{ key: 'rawPath', path: currentPhoto.rawPath },
			]) {
				if (!path) continue;
				const ext = path.split('.').pop();
				const newName = `${updatedName}.${ext}`;

				await invoke('rename_file', { filePath: path, newName });
				updatedPaths[key] = `${currentPhoto.dirPath}${separator}${newName}`;
			}

			setImages((prev) => {
				const next = [...prev];
				next[currentIndex] = {
					...currentPhoto,
					baseName: updatedName,
					...updatedPaths,
				};
				return next;
			});
		} catch (e) {
			setError(`Failed to rename file group: ${e}`);
		}
	};

	const handleImageLoad = (e) => {
		setNaturalSize({
			width: e.target.naturalWidth,
			height: e.target.naturalHeight,
		});
		setImageLoaded(true);
	};

	const handleImageError = (e) => {
		console.error('Image load error:', e, 'Path:', displayPath);
		setError(`Failed to load image: ${getFileName()}`);
	};

	if (loading) {
		return (
			<div className="photo-sort-screen">
				<div className="loading">Loading images...</div>
			</div>
		);
	}

	// Current photo object ({ baseName, dirPath, rawPath, jpegPath })
	const currentPhoto = images[currentIndex];

	// Display JPEG if present, otherwise fall back to RAW path
	const displayPath = currentPhoto?.jpegPath || currentPhoto?.rawPath || '';
	const imageUrl = displayPath ? convertFileSrc(displayPath) : '';

	// Helper to get current display base name
	const getFileName = () => currentPhoto?.baseName || '';

	// Helper to get current star rating
	const currentRating = currentPhoto?.rating || 0;

	const handleBackToSetup = (e) => {
		if (e) e.preventDefault();
		setShowConfirmModal(true);
	};

	const handleConfirmBack = () => {
		setShowConfirmModal(false);
		onBackToSetup();
	};

	const handleCancelBack = () => {
		setShowConfirmModal(false);
	};

	return (
		<div className="photo-sort-screen">
			<div className="left-column">
				{/* Zoom Preview Strip */}
				<ZoomStrip
					imageUrl={imageUrl}
					imageLoaded={imageLoaded}
					naturalSize={naturalSize}
					panX={panX}
					panY={panY}
					zoomPreviewRef={zoomPreviewRef}
				/>

				{/* Main content area */}
				<div className="main-content">
					{/* Image Viewer Section */}
					<div
						className="image-display"
						ref={imageRef}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseUp}
						style={{ cursor: imageZoom > 1 ? 'grab' : 'default' }}
					>
						{images.length > 0 ? (
							<>
								<img
									ref={imageElementRef}
									src={imageUrl}
									alt="Current photo"
									className="photo"
									onLoad={handleImageLoad}
									onError={handleImageError}
									style={{
										transform: `translate(${panX}px, ${panY}px) scale(${imageZoom})`,
										cursor: imageZoom > 1 ? 'grabbing' : 'default',
										pointerEvents: 'none' // Prevents browser native image-ghosting drag
									}}
								/>

								{/* Zoom Controls */}
								<div className="zoom-controls">
									<button onClick={handleZoomOut} title="Zoom Out (- key)">
										−
									</button>
									<span className="zoom-level">{(imageZoom * 100).toFixed(0)}%</span>
									<button onClick={handleZoomIn} title="Zoom In (+ key)">
										+
									</button>
									<button
										onClick={resetZoom}
										title="Reset Zoom / Pan (0 key)"
										disabled={imageZoom === 1 && panX === 0 && panY === 0}
										className="reset-zoom-btn"
									>
										↺
									</button>
								</div>
							</>
						) : (
							<div className="completion-card">
								<h2>All Done! 🎉</h2>
								<p className="completion-message">All photos in this folder have been sorted.</p>
								<button
									className="btn btn-back-primary"
									onClick={(e) => handleBackToSetup(e)}
								>
									⟲ SORT ANOTHER FOLDER
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Right Sidebar */}
			<div className="right-sidebar">
				{/* File Info Section */}
				<FileInfo
					ref={fileInfoRef}
					currentPhoto={currentPhoto}
					disabled={images.length === 0}
					onRenameSave={handleRenameSave}
				/>

				{/* Progress & Navigation Section */}
				<Navigation
					currentIndex={currentIndex}
					totalImages={images.length}
					onPrevious={handlePreviousPhoto}
					onNext={handleNextPhoto}
				/>

				{/* Rating Section */}
				<div className="sidebar-section rating-section">
					<label className="section-label">Rating (Keys 1-5, 0 to clear)</label>
					<div className="star-rating">
						{[1, 2, 3, 4, 5].map((star) => {
							const currentRating = currentPhoto?.rating || 0;
							return (
								<button
									key={star}
									type="button"
									className={`star-btn ${star <= currentRating ? 'filled' : 'empty'}`}
									onClick={() => handleSetRating(star)}
									disabled={images.length === 0}
									title={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
								>
									{star <= currentRating ? '★' : '☆'}
								</button>
							);
						})}
					</div>
				</div>

				{/* Histogram Section */}
				<div className="sidebar-section histogram-section">
					<label className="section-label">Light Histogram</label>
					{images.length > 0 && imageUrl ? (
						<Histogram src={imageUrl} />
					) : (
						<div className="histogram-placeholder">No Image</div>
					)}
				</div>

				{/* Action Buttons Section */}
				<div className="sidebar-section action-section">
					<div className="action-buttons-vertical">
						<button
							className="btn btn-keep"
							onClick={handleKeep}
							disabled={images.length === 0}
							title="Keep this photo (K key)"
						>
							KEEP
						</button>
						<button
							className="btn btn-discard"
							onClick={handleDiscard}
							disabled={images.length === 0}
							title="Discard this photo (D key)"
						>
							DISCARD
						</button>
					</div>
				</div>

				{/* Undo / Redo Section */}
				<div className="sidebar-section history-section">
					<label className="section-label">History</label>
					<div className="history-buttons-vertical">
						<button
							className="btn btn-history"
							onClick={handleUndo}
							disabled={history.length === 0}
							title="Undo last action (Ctrl+Z)"
						>
							↶ Undo ({history.length})
						</button>
						<button
							className="btn btn-history"
							onClick={handleRedo}
							disabled={redoStack.length === 0}
							title="Redo action (Ctrl+Y)"
						>
							↷ Redo ({redoStack.length})
						</button>
					</div>
				</div>

				{/* Back to Setup Section */}
				<div className="sidebar-section back-section">
					<button
						className="btn btn-back"
						onClick={(e) => handleBackToSetup(e)}
						title="Return to setup screen"
					>
						⟲ Back to Setup
					</button>
				</div>
			</div>


			{/* Error Message */}
			{error && error !== 'All photos have been sorted!' && (
				<div className="error-banner">{error}</div>
			)}

			{/* Completion Message */}
			{error === 'All photos have been sorted!' && (
				<div className="completion-banner">{error}</div>
			)}

			{/* Confirmation Modal */}
			{/* {showConfirmModal && (
				<div className="ps-modal-backdrop" onClick={handleCancelBack}>
					<div className="ps-modal-box" onClick={(e) => e.stopPropagation()}>
						<h3 className="ps-modal-title">Return to Setup?</h3>
						<p className="ps-modal-text">
							{history.length > 0 || redoStack.length > 0
								? "Are you sure you want to go back to setup? Your undo/redo history for this session will be lost."
								: "Are you sure you want to return to the setup screen?"}
						</p>
						<div className="ps-modal-actions">
							<button type="button" className="ps-btn-cancel" onClick={handleCancelBack}>
								Cancel
							</button>
							<button type="button" className="ps-btn-confirm" onClick={handleConfirmBack}>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)} */}
			<ConfirmModal
				isOpen={showConfirmModal}
				hasHistory={history.length > 0 || redoStack.length > 0}
				onConfirm={handleConfirmBack}
				onCancel={handleCancelBack}
			/>

		</div>
	);
}