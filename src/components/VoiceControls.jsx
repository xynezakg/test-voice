import React from 'react';

export default function VoiceControls({ isMuted, onToggleMute, onLeave }) {
  return (
    <div className="voice-controls-dock">
      <div className="controls-wrapper">
        {/* Mute/Unmute Button */}
        <button 
          onClick={onToggleMute} 
          className={`control-btn mic-btn ${isMuted ? 'muted' : 'active'}`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            // Muted Mic Icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          ) : (
            // Unmuted Mic Icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
          <span className="btn-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Leave Room Button */}
        <button 
          onClick={onLeave} 
          className="control-btn leave-btn"
          title="Leave consultation room"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6.07-6.07 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
          </svg>
          <span className="btn-label">Leave Room</span>
        </button>
      </div>
      
      <div className="mic-status-text">
        {isMuted ? (
          <span className="text-muted">🔴 Microphone is muted</span>
        ) : (
          <span className="text-active">🟢 Microphone is active</span>
        )}
      </div>
    </div>
  );
}
