import React from 'react';

export default function Navigation({
    currentIndex,
    totalImages,
    onPrevious,
    onNext
}) {
    const hasImages = totalImages > 0;

    return (
        <div className="sidebar-section progress-section">
            <div className="progress-bar-capsule">
                <button
                    type="button"
                    className="nav-arrow-btn"
                    disabled={!hasImages}
                    onClick={onPrevious}
                    title="Previous (← arrow key)"
                >
                    ◀
                </button>

                <div className="progress-indicator">
                    <span className="progress-number">
                        {hasImages ? currentIndex + 1 : 0}
                    </span>
                    <span className="progress-separator">/</span>
                    <span className="progress-total">{totalImages}</span>
                </div>

                <button
                    type="button"
                    className="nav-arrow-btn"
                    disabled={!hasImages}
                    onClick={onNext}
                    title="Next (→ arrow key)"
                >
                    ▶
                </button>
            </div>
        </div>
    );
}