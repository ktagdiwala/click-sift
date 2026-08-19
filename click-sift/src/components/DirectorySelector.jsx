import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import '../styles/DirectorySelector.css';

export default function DirectorySelector({ value, onChange, placeholder }) {
	const handleBrowseClick = async () => {
		// This will integrate with Tauri's native file dialog
		// For now, we'll show a basic implementation
		try {
			// TODO: Integrate with @tauri-apps/plugin-dialog when available
			// For now, you can use the native file picker via Tauri's invoke
			console.log('Opening file picker...');
			const selected = await open({
				directory: true,	// Select folders instead of files
				multiple: false,		// Return a single path string
				title: 'Select Folder',
			});
			// If the user selects a folder (and didn't cancel), pass the string path up
			if (selected) {
				onChange(selected);
			}
		} catch (err) {
			console.error('Failed to open file picker:', err);
		}
	};

	return (
		<div className="directory-selector">
		  <div className="selector-input-group">
			<input
			  type="text"
			  value={value}
			  onChange={(e) => onChange(e.target.value)}
			  placeholder={placeholder}
			  className="selector-input"
			  readOnly={false}
			/>
			<button 
			  type="button"
			  className="btn-browse" 
			  onClick={handleBrowseClick}
			>
			  Browse
			</button>
		  </div>
		</div>
	  );
}