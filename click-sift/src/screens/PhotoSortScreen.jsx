import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

// Components
import ZoomStrip from '../components/ZoomStrip';
import FileInfo from '../components/FileInfo';
import Navigation from '../components/Navigation';
import RatingControls from '../components/RatingControls';
import ActionControls from '../components/ActionControls';
import Histogram from '../components/Histogram';
import UndoRedoControls from '../components/UndoRedoControls';
import ConfirmModal from '../components/ConfirmModal';

// Utils
import { groupImagePaths, getClampedPan } from '../utils/imageUtils'

// Hooks
import { usePhotoActions } from '../hooks/usePhotoActions';
import { useImageZoomPan } from '../hooks/useImageZoomPan';

// Styles
import '../styles/PhotoSortScreen.css';

export default function PhotoSortScreen({ config, onBackToSetup }) {
	const [keptCount, setKeptCount] = useState(0);
	const [discardedCount, setDiscardedCount] = useState(0);
	const [images, setImages] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
	const [imageLoaded, setImageLoaded] = useState(false);
	const imageRef = useRef(null);
	const imageElementRef = useRef(null);
	const zoomPreviewRef = useRef(null);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const fileInfoRef = useRef(null);
	const [keepZoomOnNav, setKeepZoomOnNav] = useState(false); // State for toggle setting (default false, meaning zoom resets as normal)
	const currentPhotoPath = images[currentIndex]?.jpegPath || images[currentIndex]?.rawPath;
	const prevPhotoPathRef = useRef(currentPhotoPath);

	// Custom Hooks
	const {
		handleKeep,
		handleDiscard,
		handleUndo,
		handleRedo,
		history,
		redoStack,
	} = usePhotoActions(config, images, setImages, currentIndex, setCurrentIndex, setError);

	const {
		imageZoom,
		panX,
		panY,
		handleZoomIn,
		handleZoomOut,
		resetZoom,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
	} = useImageZoomPan(imageRef, imageElementRef, imageLoaded);

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

	// Reset zoom when switching to a new image
	useEffect(() => {
		if (currentPhotoPath && currentPhotoPath !== prevPhotoPathRef.current) {
			setImageLoaded(false);
			if (!keepZoomOnNav) {
				resetZoom();
			}
			prevPhotoPathRef.current = currentPhotoPath;
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
				case 'l':
					setKeepZoomOnNav((prev) => !prev);
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
				const clamped = getClampedPan(rawX, rawY, newZoom, imageRef, imageElementRef);
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
									{/* Lock/Keep Zoom Toggle */}
									<button
										type="button"
										className={`zoom-toggle-btn ${keepZoomOnNav ? 'active' : ''}`}
										onClick={() => setKeepZoomOnNav((prev) => !prev)}
										title={
											keepZoomOnNav
												? 'Zoom level is locked across photo changes (Click to unlock)'
												: 'Zoom level resets on photo change (Click to lock zoom)'
										}
									>
										{keepZoomOnNav ? '🔒' : '🔓'}
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
				<RatingControls
					currentRating={currentPhoto?.rating || 0}
					disabled={images.length === 0}
					onSetRating={handleSetRating}
				/>

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
				<ActionControls
					disabled={images.length === 0}
					onKeep={handleKeep}
					onDiscard={handleDiscard}
				/>

				{/* Undo / Redo Section */}
				<UndoRedoControls
					historyCount={history.length}
					redoCount={redoStack.length}
					onUndo={handleUndo}
					onRedo={handleRedo}
				/>

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
			<ConfirmModal
				isOpen={showConfirmModal}
				hasHistory={history.length > 0 || redoStack.length > 0}
				onConfirm={handleConfirmBack}
				onCancel={handleCancelBack}
			/>
		</div>
	);
}