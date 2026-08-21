import React from 'react';

export default function RatingControls({
    currentRating = 0,
    disabled = false,
    onSetRating
}) {
    return (
        <div className="sidebar-section rating-section">
            <label className="section-label">Rating (Keys 1-5, 0 to clear)</label>
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= currentRating ? 'filled' : 'empty'}`}
                        onClick={() => onSetRating(star)}
                        disabled={disabled}
                        title={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
                    >
                        {star <= currentRating ? '★' : '☆'}
                    </button>
                ))}
            </div>
        </div>
    );
}