import { useState, useEffect, useCallback, useRef } from 'react';

// Components
import ZoomStrip from '../components/ZoomStrip';
import ZoomControls from '../components/ZoomControls';
import FileInfo from '../components/FileInfo';
import Navigation from '../components/Navigation';
import RatingControls from '../components/RatingControls';
import ActionControls from '../components/ActionControls';
import Histogram from '../components/Histogram';
import UndoRedoControls from '../components/UndoRedoControls';
import ConfirmModal from '../components/ConfirmModal';
import ShortcutsHelpModal from '../components/ShortcutsHelpModal';

// Utils
import { getImageUrl, getFileName } from '../utils/imageUtils';

// Hooks
import { usePhotoActions } from '../hooks/usePhotoActions';
import { useImageZoomPan } from '../hooks/useImageZoomPan';
import { useShortcuts } from '../hooks/useShortcuts';
import { useImageLoader } from '../hooks/useImageLoader';
import { useImageRating } from '../hooks/useImageRating';
import { useImageRename } from '../hooks/useImageRename';
import { usePhotoNav } from '../hooks/usePhotoNav';

// Styles
import '../styles/PhotoSortScreen.css';

export default function PhotoSortScreen({ config, onBackToSetup }) {
	// const [currentIndex, setCurrentIndex] = useState(0);
	const [error, setError] = useState('');
	const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
	const [imageLoaded, setImageLoaded] = useState(false);
	const imageRef = useRef(null);
	const imageElementRef = useRef(null);
	const zoomPreviewRef = useRef(null);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const fileInfoRef = useRef(null);
	const [keepZoomOnNav, setKeepZoomOnNav] = useState(false); // State for toggle setting (default false, meaning zoom resets as normal)
	const [stripDimensions, setStripDimensions] = useState({ width: 300, height: 100 });
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const prevStripHeightRef = useRef(100); // Store previous height for restoring after collapse
	const [showShortcutsModal, setShowShortcutsModal] = useState(false);
	const isAnyModalOpen = showConfirmModal || showShortcutsModal;

	const handleCloseActiveModal = () => {
		if (showConfirmModal) setShowConfirmModal(false);
		if (showShortcutsModal) setShowShortcutsModal(false);
	};

	// Custom Hooks
	// State and data hooks
	const {
		images,
		setImages,
		loading
	} = useImageLoader(config.targetDir, setError);

	// Image zoom and pan hook
	const {
		imageZoom,
		panX,
		panY,
		hoverCoords,
		lensSize,
		isHovering,
		handleZoomIn,
		handleZoomOut,
		resetZoom,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseEnter,
		handleMouseLeave,
	} = useImageZoomPan(imageRef, imageElementRef, imageLoaded, stripDimensions);

	// Photo navigation hook
	const {
		currentIndex,
		setCurrentIndex,
		handleNextPhoto,
		handlePreviousPhoto,
	} = usePhotoNav(images, keepZoomOnNav, resetZoom, setImageLoaded);

	// Photo actions hook
	const {
		handleKeep,
		handleDiscard,
		handleUndo,
		handleRedo,
		addRenameAction,
		history,
		redoStack,
	} = usePhotoActions(config, images, setImages, currentIndex, setCurrentIndex, setError);

	// Rating and renaming hooks
	const { handleSetRating } = useImageRating(images, setImages, currentIndex, setError);
	const { handleRenameSave } = useImageRename(images, setImages, currentIndex, setError, addRenameAction);

	const handleToggleFullscreen = useCallback(() => {
		setSidebarCollapsed((prevSidebar) => {
			const isCollapsing = !prevSidebar;

			if (isCollapsing) {
				// Enter Fullscreen: Save height and set to 0
				setStripDimensions((prevDimensions) => {
					if (prevDimensions.height > 0) {
						prevStripHeightRef.current = prevDimensions.height;
					}
					return { ...prevDimensions, height: 0 };
				});
			} else {
				// Exit Fullscreen: Restore height
				setStripDimensions((prevDimensions) => ({
					...prevDimensions,
					height: prevStripHeightRef.current > 0 ? prevStripHeightRef.current : 100,
				}));
			}

			return isCollapsing;
		});
	}, []);

	// Keyboard shortcuts hook
	useShortcuts({
		isModalOpen: isAnyModalOpen,
		onCloseModal: handleCloseActiveModal,
		onUndo: handleUndo,
		onRedo: handleRedo,
		onSetRating: handleSetRating,
		onKeep: handleKeep,
		onDiscard: handleDiscard,
		onNext: () => setCurrentIndex(i => (i + 1) % images.length),
		onPrevious: () => setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1)),
		onZoomIn: handleZoomIn,
		onZoomOut: handleZoomOut,
		onResetZoom: resetZoom,
		onOpenRename: () => fileInfoRef.current?.openRename(),
		onToggleLockZoom: () => setKeepZoomOnNav(prev => !prev),
		onToggleFullscreen: handleToggleFullscreen,
		onToggleHelp: () => setShowShortcutsModal(prev => !prev),
	}, [currentIndex, images, history, redoStack, isAnyModalOpen, handleToggleFullscreen]);

	// Current photo and its display path
	const currentPhoto = images[currentIndex];
	const imageUrl = getImageUrl(currentPhoto);
	const fileName = getFileName(currentPhoto);

	const handleImageLoad = (e) => {
		setNaturalSize({
			width: e.target.naturalWidth,
			height: e.target.naturalHeight,
		});
		setImageLoaded(true);
	};

	const handleImageError = (e) => {
		console.error('Image load error:', e);
		setError(`Failed to load image: ${fileName}`);
	};

	if (loading) {
		return (
			<div className="photo-sort-screen">
				<div className="loading">Loading images...</div>
			</div>
		);
	}

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
					imageZoom={imageZoom}
					hoverCoords={hoverCoords}
					onDimensionsChange={setStripDimensions}
					stripDimensions={stripDimensions}
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
						onMouseLeave={handleMouseLeave}
						onMouseEnter={handleMouseEnter}
						style={{ cursor: imageZoom > 1 ? 'grab' : 'crosshair' }}
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
										cursor: imageZoom > 1 ? 'grabbing' : 'crosshair',
										pointerEvents: 'none' // Prevents browser native image-ghosting drag
									}}
								/>

								{/* Magnifier Target Lens Box (Active only when zoomed out at 1x) */}
								{isHovering && imageZoom === 1 && (stripDimensions?.height > 0) && imageLoaded && imageElementRef.current && (() => {
									const imgRect = imageElementRef.current.getBoundingClientRect();
									const containerRect = imageRef.current?.getBoundingClientRect() || imgRect;

									// Calculate offset of image within container
									const imgLeftOffset = imgRect.left - containerRect.left;
									const imgTopOffset = imgRect.top - containerRect.top;

									const lensWidthPx = (lensSize.widthPercent / 100) * imgRect.width;
									const lensHeightPx = (lensSize.heightPercent / 100) * imgRect.height;

									const lensCenterX = imgLeftOffset + (hoverCoords.x / 100) * imgRect.width;
									const lensCenterY = imgTopOffset + (hoverCoords.y / 100) * imgRect.height;

									return (
										<div
											className="magnifier-lens"
											style={{
												position: 'absolute',
												top: `${lensCenterY}px`,
												left: `${lensCenterX}px`,
												width: `${lensWidthPx}px`,
												height: `${lensHeightPx}px`,
												transform: 'translate(-50%, -50%)',
												border: '2px solid rgba(255, 255, 255, 0.85)',
												boxShadow: '0 0 8px rgba(0, 0, 0, 0.5), inset 0 0 4px rgba(0, 0, 0, 0.3)',
												borderRadius: '4px',
												pointerEvents: 'none',
												backgroundColor: 'rgba(255, 255, 255, 0.12)',
											}}
										/>
									);
								})()}

								{/* Zoom Controls */}
								<ZoomControls
									imageZoom={imageZoom}
									panX={panX}
									panY={panY}
									keepZoomOnNav={keepZoomOnNav}
									onZoomIn={handleZoomIn}
									onZoomOut={handleZoomOut}
									onResetZoom={resetZoom}
									onToggleKeepZoom={() => setKeepZoomOnNav((prev) => !prev)}
									onToggleFullscreen={handleToggleFullscreen}
								/>
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
			<div className={`right-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
						className="btn-toggle-sidebar"
						onClick={() => setSidebarCollapsed(true)}
						title="Hide Sidebar"
						aria-label="Hide Sidebar"
					>
						▶
					</button>
					<button
						className="btn btn-back"
						onClick={(e) => handleBackToSetup(e)}
						title="Return to setup screen"
					>
						⟲ Back to Setup
					</button>
				</div>
			</div>

			{/* Top Right Progress Overlay (Visible only in Fullscreen/Collapsed mode) */}
			{sidebarCollapsed && images.length > 0 && (
				<div className="fullscreen-progress-overlay">
					<span className="progress-number">{currentIndex + 1}</span>
					<span className="progress-separator">/</span>
					<span className="progress-total">{images.length}</span>
				</div>
			)}
			{sidebarCollapsed && (
				<button
					className="btn-show-sidebar-floating"
					onClick={() => setSidebarCollapsed(false)}
					title="Show Sidebar"
					aria-label="Show Sidebar"
				>
					◀
				</button>
			)}

			{/* Floating Help Button */}
			<button
				type="button"
				className="btn-help-trigger"
				onClick={() => setShowShortcutsModal(true)}
				title="Keyboard Shortcuts"
				aria-label="Keyboard Shortcuts"
			>
				?
			</button>

			{/* Shortcuts Modal */}
			<ShortcutsHelpModal
				isOpen={showShortcutsModal}
				onClose={() => setShowShortcutsModal(false)}
			/>

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