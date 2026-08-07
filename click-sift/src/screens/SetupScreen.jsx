import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import DirectorySelector from '../components/DirectorySelector';
import '../styles/SetupScreen.css';

export default function SetupScreen({ onComplete }) {
  const [targetDir, setTargetDir] = useState('');
  const [keepDir, setKeepDir] = useState('keep');
  const [discardDir, setDiscardDir] = useState('discard');
  const [useExisting, setUseExisting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTargetDirSelect = (path) => {
    setTargetDir(path);
    setError('');
  };

  const handleKeepDirSelect = (path) => {
    setKeepDir(path);
  };

  const handleDiscardDirSelect = (path) => {
    setDiscardDir(path);
  };

  const handleUseExistingChange = (e) => {
    setUseExisting(e.target.checked);
    setError('');
  };

  const handleNext = async () => {
    setError('');
    setLoading(true);

    try {
      // Validate target directory
      if (!targetDir) {
        setError('Please select a target directory');
        setLoading(false);
        return;
      }

      const isValid = await invoke('validate_directory', { path: targetDir });
      if (!isValid) {
        setError('Invalid target directory');
        setLoading(false);
        return;
      }

      // If using existing folders, validate them
      if (useExisting) {
        try {
          await invoke('validate_directory', { path: keepDir });
        } catch (e) {
          setError(`Invalid keep directory: ${e}`);
          setLoading(false);
          return;
        }

        try {
          await invoke('validate_directory', { path: discardDir });
        } catch (e) {
          setError(`Invalid discard directory: ${e}`);
          setLoading(false);
          return;
        }
      } else {
        // Create directories
        try {
          await invoke('create_directories', {
            target_dir: targetDir,
            keep_dir: keepDir,
            discard_dir: discardDir,
          });
        } catch (e) {
          setError(`Failed to create directories: ${e}`);
          setLoading(false);
          return;
        }
      }

      // Success - proceed to next screen
      onComplete({
        targetDir,
        keepDir: useExisting ? keepDir : `${targetDir}\\${keepDir}`,
        discardDir: useExisting ? discardDir : `${targetDir}\\${discardDir}`,
        useExisting,
      });
    } catch (e) {
      setError(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-container">
        <h1>Photo Sorter Setup</h1>
        <p className="subtitle">Configure where your photos are located</p>

        <div className="setup-form">
          <div className="form-section">
            <label className="section-title">Target Directory</label>
            <p className="section-description">
              Select the folder containing all your photos to sort
            </p>
            <DirectorySelector
              value={targetDir}
              onChange={handleTargetDirSelect}
              placeholder="Click to select folder..."
            />
          </div>

          <div className="form-section">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useExisting}
                  onChange={handleUseExistingChange}
                />
                <span>Use existing folders for "Keep" and "Discard"</span>
              </label>
            </div>
          </div>

          {useExisting ? (
            <>
              <div className="form-section">
                <label className="section-title">Keep Folder</label>
                <DirectorySelector
                  value={keepDir}
                  onChange={handleKeepDirSelect}
                  placeholder="Select keep folder..."
                />
              </div>

              <div className="form-section">
                <label className="section-title">Discard Folder</label>
                <DirectorySelector
                  value={discardDir}
                  onChange={handleDiscardDirSelect}
                  placeholder="Select discard folder..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-section">
                <label className="section-title">Keep Folder Name</label>
                <input
                  type="text"
                  value={keepDir}
                  onChange={(e) => setKeepDir(e.target.value)}
                  className="text-input"
                  placeholder="Folder name for photos to keep"
                />
              </div>

              <div className="form-section">
                <label className="section-title">Discard Folder Name</label>
                <input
                  type="text"
                  value={discardDir}
                  onChange={(e) => setDiscardDir(e.target.value)}
                  className="text-input"
                  placeholder="Folder name for photos to discard"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}