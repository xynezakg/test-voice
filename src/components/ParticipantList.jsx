import React from 'react';

export default function ParticipantList({ participants, localParticipant }) {
  // Combine local participant and remote participants
  const allParticipants = [];
  
  if (localParticipant) {
    allParticipants.push({
      ...localParticipant,
      isLocal: true
    });
  }

  // Add remote participants
  participants.forEach(p => {
    allParticipants.push({
      ...p,
      isLocal: false
    });
  });

  return (
    <div className="participants-card">
      <div className="card-header">
        <h3>Participants ({allParticipants.length})</h3>
        <span className="live-badge">Live</span>
      </div>
      
      <div className="participants-list">
        {allParticipants.length === 0 ? (
          <div className="empty-list">No participants in the room.</div>
        ) : (
          allParticipants.map((participant) => (
            <div 
              key={participant.socketId} 
              className={`participant-item ${participant.isSpeaking ? 'speaking-active' : ''} ${participant.isMuted ? 'muted-active' : ''}`}
            >
              <div className="participant-avatar-wrapper">
                <div className={`participant-avatar ${participant.isLocal ? 'local-avatar' : 'remote-avatar'}`}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
                {/* Voice activity waves when speaking */}
                {participant.isSpeaking && (
                  <div className="voice-waves">
                    <span className="wave-ring wave-1"></span>
                    <span className="wave-ring wave-2"></span>
                  </div>
                )}
              </div>

              <div className="participant-details">
                <span className="participant-name">
                  {participant.displayName}
                  {participant.isLocal && <span className="you-tag"> (You)</span>}
                </span>
                
                <span className="participant-status">
                  {participant.isSpeaking ? (
                    <span className="status-label speaking">Speaking</span>
                  ) : participant.isMuted ? (
                    <span className="status-label muted">Muted</span>
                  ) : (
                    <span className="status-label connected">Connected</span>
                  )}
                </span>
              </div>

              <div className="participant-indicators">
                {participant.isMuted && (
                  <div className="indicator-icon mute-indicator" title="User is muted">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </div>
                )}
                
                {participant.isSpeaking ? (
                  <div className="speaking-dot-container">
                    <span className="speaking-dot"></span>
                  </div>
                ) : (
                  <span className="idle-dot"></span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
