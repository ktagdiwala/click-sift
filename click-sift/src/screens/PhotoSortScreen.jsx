import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import '../styles/PhotoSortScreen.css';

export default function PhotoSortScreen({ config, onBackToSetup }) {
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
	const [imageLoaded, setImageLoaded] = useState(false);
	//   const [imageUrl, setImageUrl] = useState('');
	const imageRef = useRef(null);
	const imageElementRef = useRef(null);
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
			const currentFilePath = images[currentIndex];
			const fileName = currentFilePath.split('\\').pop() || currentFilePath.split('/').pop();
			setNewFileName(fileName);
			setImageLoaded(false);
			resetZoom();
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
			if (!imageRef.current || renameMode || !imageLoaded) return;

			e.preventDefault();
			const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
			setImageZoom((prev) => Math.max(1, Math.min(5, prev * zoomFactor)));
		};

		const imageElement = imageRef.current;
		if (imageElement) {
			imageElement.addEventListener('wheel', handleWheel, { passive: false });
			return () => imageElement.removeEventListener('wheel', handleWheel);
		}
	}, [renameMode, imageLoaded]);

	const getFileName = useCallback(() => {
		if (images.length === 0) return '';
		const filePath = images[currentIndex];
		return filePath.split('\\').pop() || filePath.split('/').pop();
	}, [images, currentIndex]);

	const handleKeep = async () => {
		if (images.length === 0) return;

		try {
			const source = images[currentIndex];
			const fileName = getFileName();
			const destination = `${config.keepDir}\\${fileName}`;

			await invoke('move_file', {
				source,
				destination,
			});

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
			const source = images[currentIndex];
			const fileName = getFileName();
			const destination = `${config.discardDir}\\${fileName}`;

			await invoke('move_file', {
				source,
				destination,
			});

			const newIndex = currentIndex < images.length - 1 ? currentIndex: 0;
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

	const handleMouseDown = (e) => {
		if (imageZoom > 1 && imageLoaded) {
			setIsDragging(true);
			setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
		}
	};

	const handleMouseMove = (e) => {
		if (isDragging && imageZoom > 1) {
			const maxPanX = (imageElementRef.current?.offsetWidth || 0) * (imageZoom - 1) / 2;
			const maxPanY = (imageElementRef.current?.offsetHeight || 0) * (imageZoom - 1) / 2;

			const newPanX = Math.max(-maxPanX, Math.min(maxPanX, e.clientX - dragStart.x));
			const newPanY = Math.max(-maxPanY, Math.min(maxPanY, e.clientY - dragStart.y));

			setPanX(newPanX);
			setPanY(newPanY);
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleRenameClick = () => {
		setRenameMode(true);
	};

	const handleRenameSave = async () => {
		if (newFileName === getFileName()) {
			setRenameMode(false);
			return;
		}

		try {
			const oldPath = images[currentIndex];
			await invoke('rename_file', {
				filePath: oldPath,
				newName: newFileName,
			});

			const newImages = [...images];
			const dirPath = oldPath.substring(0, oldPath.lastIndexOf('\\') || oldPath.lastIndexOf('/'));
			newImages[currentIndex] = `${dirPath}\\${newFileName}`;
			setImages(newImages);
			setRenameMode(false);
		} catch (e) {
			setError(`Failed to rename file: ${e}`);
		}
	};

	const handleRenameCancel = () => {
		setRenameMode(false);
		setNewFileName(getFileName());
	};

	const handleImageLoad = () => {
		setImageLoaded(true);
	};

	const handleImageError = (e) => {
		console.error('Image load error:', e, 'Path:', images[currentIndex]);
		setError(`Failed to load image: ${getFileName()}`);
	};

	if (loading) {
		return (
			<div className="photo-sort-screen">
				<div className="loading">Loading images...</div>
			</div>
		);
	}

	//   if (error && images.length === 0) {
	//     return (
	//       <div className="photo-sort-screen">
	//         <div className="error-message">{error}</div>
	//       </div>
	//     );
	//   }

	//   if (images.length === 0) {
	//     return (
	//       <div className="photo-sort-screen">
	//         <div className="error-message">No images to sort.</div>
	//       </div>
	//     );
	//   }

	// Replace the empty images check near the top of your component:
	if (images.length === 0 && !loading) {
		return (
			<div className="photo-sort-screen completion-screen">
				<div className="completion-card">
					<h2>All Done! 🎉</h2>
					<p className="completion-message">{error || 'All photos in this folder have been sorted.'}</p>

					<button
						className="btn btn-back-primary"
						onClick={onBackToSetup}
					>
						⟲ SORT ANOTHER FOLDER
					</button>
				</div>
			</div>
		);
	}


	const currentFilePath = images[currentIndex];
	const imageUrl = convertFileSrc(currentFilePath);

	return (
		<div className="photo-sort-screen">
			{/* Zoom Preview Strip */}
			<div className="zoom-preview-container">
				<div
					className="zoom-preview"
					ref={zoomPreviewRef}
					style={{
						backgroundImage: imageLoaded ? `url(${imageUrl})` : 'none',
						backgroundPosition: `${Math.max(0, Math.min(100, 50 + (panX / (imageElementRef.current?.offsetWidth || 1)) * 50))}% ${Math.max(0, Math.min(100, 50 + (panY / (imageElementRef.current?.offsetHeight || 1)) * 50))}%`,
					}}
				>
					{imageLoaded && (
						<div
							className="zoom-preview-frame"
							style={{
								width: `${Math.min(100, (1 / imageZoom) * 100)}%`,
								height: `${Math.min(100, (1 / imageZoom) * 100)}%`,
								left: `${Math.max(0, Math.min(100 - (1 / imageZoom) * 100, 50 - (panX / (imageElementRef.current?.offsetWidth || 1)) * 50 - (1 / imageZoom) * 50))}%`,
								top: `${Math.max(0, Math.min(100 - (1 / imageZoom) * 100, 50 - (panY / (imageElementRef.current?.offsetHeight || 1)) * 50 - (1 / imageZoom) * 50))}%`,
							}}
						/>
					)}
				</div>
			</div>

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
					<img
						ref={imageElementRef}
						src={imageUrl}
						alt="Current photo"
						className="photo"
						onLoad={handleImageLoad}
						onError={handleImageError}
						style={{
							transform: `scale(${imageZoom}) translate(${panX}px, ${panY}px)`,
							cursor: imageZoom > 1 ? 'grabbing' : 'default',
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
					</div>
				</div>

				{/* Right Sidebar */}
				<div className="right-sidebar">
					{/* File Info Section */}
					<div className="sidebar-section file-section">
						<label className="section-label">Current File</label>
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
								<span className="filename">{getFileName()}</span>
								<span className="edit-hint">Click to rename</span>
							</div>
						)}
					</div>

					{/* Progress Section */}
					<div className="sidebar-section progress-section">
						<label className="section-label">Progress</label>
						<div className="progress-indicator">
							<span className="progress-number">{currentIndex + 1}</span>
							<span className="progress-separator">/</span>
							<span className="progress-total">{images.length}</span>
						</div>
					</div>

					{/* Navigation Section */}
					<div className="sidebar-section nav-section">
						<label className="section-label">Navigate</label>
						<div className="nav-buttons-vertical">
							<button
								className="nav-button prev-button"
								onClick={handlePreviousPhoto}
								title="Previous (← arrow key)"
							>
								◀ Previous
							</button>
							<button
								className="nav-button next-button"
								onClick={handleNextPhoto}
								title="Next (→ arrow key)"
							>
								Next ▶
							</button>
						</div>
					</div>

					{/* Action Buttons Section */}
					<div className="sidebar-section action-section">
						<label className="section-label">Action</label>
						<div className="action-buttons-vertical">
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
								DISCARD
							</button>
						</div>
					</div>

					{/* Back to Setup Section */}
					<div className="sidebar-section back-section">
						<button
							className="btn btn-back"
							onClick={onBackToSetup}
							title="Return to setup screen"
						>
							⟲ Back to Setup
						</button>
					</div>
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
		</div>
	);
}