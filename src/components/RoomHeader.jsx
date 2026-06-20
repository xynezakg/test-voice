import React, { useState } from 'react';

export default function RoomHeader({ roomId, connectionStatus }) {
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-emerald-500 shadow-[0_0_12px_#10b981]';
      case 'connecting': return 'bg-amber-500 animate-pulse shadow-[0_0_12px_#f59e0b]';
      case 'disconnected':
      default: return 'bg-rose-500 shadow-[0_0_12px_#f43f5e]';
    }
  };

  return (
    <div className="room-header-container">
      <div className="header-info">
        <div className="app-brand">
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18Z" fill="currentColor"/>
              <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Voice Consult</h1>
        </div>
        
        <div className="room-id-pill" onClick={copyRoomId} title="Click to copy Room ID">
          <span className="label">ROOM ID:</span>
          <span className="value">{roomId}</span>
          <button className="copy-btn">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
          {copied && <span className="copied-tooltip">Copied!</span>}
        </div>
      </div>

      <div className="status-indicator">
        <span className={`status-dot ${getStatusColor()}`}></span>
        <span className="status-text">
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
