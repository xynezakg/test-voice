import React, { useState } from 'react';

export default function JoinRoomForm({ onJoin, micError }) {
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateRandomRoomId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setRoomId(`room-${randomNum}`);
    // Clear room error if it exists
    if (errors.roomId) {
      setErrors(prev => ({ ...prev, roomId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display Name is required';
    } else if (displayName.length > 20) {
      newErrors.displayName = 'Name must be 20 characters or less';
    }

    if (!roomId.trim()) {
      newErrors.roomId = 'Room ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
      newErrors.roomId = 'Room ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    
    try {
      await onJoin({ displayName: displayName.trim(), roomId: roomId.trim() });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="join-form-card">
      <div className="join-header">
        <h2>Enter Consultation Lobby</h2>
        <p>Join or create a secure voice channel in real-time</p>
      </div>

      {micError && (
        <div className="alert-banner alert-danger animate-fade-in">
          <svg className="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div className="alert-content">
            <strong>Microphone Access Blocked</strong>
            <p>{micError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="join-form">
        <div className="input-group">
          <label htmlFor="displayName">Display Name</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <input
              id="displayName"
              type="text"
              placeholder="e.g. Dr. Arthur Pendelton"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) setErrors(prev => ({ ...prev, displayName: '' }));
              }}
              className={errors.displayName ? 'input-error' : ''}
              disabled={isSubmitting}
            />
          </div>
          {errors.displayName && <span className="error-text">{errors.displayName}</span>}
        </div>

        <div className="input-group">
          <label htmlFor="roomId">Room ID</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input
              id="roomId"
              type="text"
              placeholder="e.g. room-341"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                if (errors.roomId) setErrors(prev => ({ ...prev, roomId: '' }));
              }}
              className={errors.roomId ? 'input-error' : ''}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="secondary-btn generate-btn"
              onClick={generateRandomRoomId}
              disabled={isSubmitting}
              title="Generate random room ID"
            >
              Generate
            </button>
          </div>
          {errors.roomId && <span className="error-text">{errors.roomId}</span>}
        </div>

        <button type="submit" className="primary-btn submit-btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="loading-spinner-container">
              <span className="spinner"></span>
              <span>Entering...</span>
            </span>
          ) : (
            <span className="btn-content">
              <span>Join Consultation Room</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
