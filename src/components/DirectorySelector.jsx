import { useState } from 'react';
import '../styles/DirectorySelector.css';

export default function DirectorySelector({ value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleBrowseClick = async () => {
    // This will integrate with Tauri's native file dialog
    // For now, we'll show a basic implementation
    try {
      // TODO: Integrate with @tauri-apps/plugin-dialog when available
      // For now, you can use the native file picker via Tauri's invoke
      console.log('Opening file picker...');
      // const selected = await open({ directory: true });
      // if (selected) {
      //   onChange(selected);
      // }
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
        <button className="btn-browse" onClick={handleBrowseClick}>
          Browse
        </button>
      </div>
    </div>
  );
}