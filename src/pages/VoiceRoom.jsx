import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { webrtcManager } from '../services/webrtc';
import JoinRoomForm from '../components/JoinRoomForm';
import RoomHeader from '../components/RoomHeader';
import ParticipantList from '../components/ParticipantList';
import VoiceControls from '../components/VoiceControls';

// Sub-component to play remote audio streams without polluting UI
const AudioPlayer = ({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay style={{ display: 'none' }} />;
};

export default function VoiceRoom() {
  const [inRoom, setInRoom] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [micError, setMicError] = useState(null);
  
  // Local participant state
  const [isMuted, setIsMuted] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  
  // Remote participants list state
  const [participants, setParticipants] = useState([]); // [{ socketId, displayName, isSpeaking, isMuted }]
  
  // Remote streams for the audio elements
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: MediaStream }

  // Store room credentials in refs to access inside event listeners without closure staleness
  const roomCredentialsRef = useRef({ roomId: '', displayName: '' });

  // WebRTC Manager event wiring
  useEffect(() => {
    // 1. When local stream is acquired
    webrtcManager.onLocalStreamReady = (stream) => {
      setMicError(null);
    };

    // 2. When a remote stream track is received from a peer
    webrtcManager.onRemoteStreamAdded = (socketId, stream) => {
      console.log(`Setting remote stream for peer: ${socketId}`);
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: stream
      }));
    };

    // 3. When a remote stream track is closed or peer disconnects
    webrtcManager.onRemoteStreamRemoved = (socketId) => {
      console.log(`Removing remote stream for peer: ${socketId}`);
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    // 4. When the local client speaking status changes (based on audio analysis)
    webrtcManager.onSpeakingStateChange = (socketId, isSpeaking) => {
      if (socketId === socket.id) {
        setIsLocalSpeaking(isSpeaking);
      }
    };

    return () => {
      // Clean up WebRTC on page unmount
      webrtcManager.closeAll();
    };
  }, []);

  // Socket.IO event listener wiring
  useEffect(() => {
    // Connection established
    const onConnect = () => {
      console.log("Connected to signaling server:", socket.id);
      setConnectionStatus('connected');
      
      // If we were already in a room (e.g. on reconnection), re-join the room
      if (roomCredentialsRef.current.roomId) {
        socket.emit('join-room', roomCredentialsRef.current);
      }
    };

    // Disconnection
    const onDisconnect = () => {
      console.log("Disconnected from signaling server");
      setConnectionStatus('disconnected');
    };

    // Receive initial room users when joining
    const onRoomUsers = (users) => {
      console.log("Received participants in room:", users);
      // Set participants state
      setParticipants(users);

      // WebRTC Multi-Party Mesh Rule:
      // The joining user initiates the WebRTC offer to all existing participants in the room.
      users.forEach(user => {
        // Create peer connection and initiate SDP offer exchange (isInitiator = true)
        webrtcManager.createPeerConnection(user.socketId, true);
      });
    };

    // Another user joined
    const onUserConnected = ({ socketId, displayName }) => {
      console.log(`User connected: [${displayName}] (${socketId})`);
      setParticipants(prev => {
        // Prevent duplicate additions
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, { socketId, displayName, isSpeaking: false, isMuted: false }];
      });
      
      // Note: We do NOT initiate an offer here.
      // The newly connected user is the one who initiates the connection to all existing users.
      // We will receive their offer shortly.
    };

    // Another user disconnected
    const onUserDisconnected = ({ socketId, displayName }) => {
      console.log(`User disconnected: [${displayName}] (${socketId})`);
      
      // Clean up peer connection
      webrtcManager.closePeerConnection(socketId);
      
      // Remove from lists
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    // Received WebRTC Offer
    const onOffer = async ({ from, offer }) => {
      // Handle the SDP offer and reply with an SDP answer
      await webrtcManager.handleOffer(from, offer);
    };

    // Received WebRTC Answer
    const onAnswer = async ({ from, answer }) => {
      // Complete the hand-shake by setting the remote description
      await webrtcManager.handleAnswer(from, answer);
    };

    // Received ICE Candidate
    const onIceCandidate = async ({ from, candidate }) => {
      // Add remote ICE candidate to the peer connection
      await webrtcManager.handleIceCandidate(from, candidate);
    };

    // Received mute status change from a participant
    const onMuteStateChange = ({ socketId, isMuted }) => {
      setParticipants(prev => 
        prev.map(p => p.socketId === socketId ? { ...p, isMuted } : p)
      );
    };

    // Received speaking status change from a participant
    const onSpeakingStateChange = ({ socketId, isSpeaking }) => {
      setParticipants(prev => 
        prev.map(p => p.socketId === socketId ? { ...p, isSpeaking } : p)
      );
    };

    // Server error handler
    const onErrorMsg = (message) => {
      console.error("Signaling error:", message);
      setMicError(message);
      handleLeaveRoom();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-users', onRoomUsers);
    socket.on('user-connected', onUserConnected);
    socket.on('user-disconnected', onUserDisconnected);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('mute-state-change', onMuteStateChange);
    socket.on('speaking-state-change', onSpeakingStateChange);
    socket.on('error-msg', onErrorMsg);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-users', onRoomUsers);
      socket.off('user-connected', onUserConnected);
      socket.off('user-disconnected', onUserDisconnected);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('mute-state-change', onMuteStateChange);
      socket.off('speaking-state-change', onSpeakingStateChange);
      socket.off('error-msg', onErrorMsg);
    };
  }, []);

  /**
   * Action: Joins the room.
   * Prompts browser mic access first. If successful, connects signaling socket.
   */
  const handleJoinRoom = async ({ displayName, roomId }) => {
    setMicError(null);
    setConnectionStatus('connecting');

    try {
      // 1. Get user mic access (essential for WebRTC)
      await webrtcManager.getLocalMedia();
      
      // 2. Setup credentials
      setDisplayName(displayName);
      setRoomId(roomId);
      roomCredentialsRef.current = { roomId, displayName };
      
      // 3. Connect to the signaling socket
      socket.connect();
      
      // 4. Emit the join-room event
      socket.emit('join-room', { roomId, displayName });
      
      setInRoom(true);
      setIsMuted(false);
    } catch (err) {
      setMicError(err.message || "Failed to access microphone.");
      setConnectionStatus('disconnected');
      throw err;
    }
  };

  /**
   * Action: Mutes or unmutes the local microphone.
   */
  const handleToggleMute = () => {
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);
    webrtcManager.setMuted(nextMuteState);
  };

  /**
   * Action: Leaves the room and cleans up WebRTC/Socket resources.
   */
  const handleLeaveRoom = () => {
    // Notify server
    socket.emit('leave-room');
    socket.disconnect();

    // Clean up WebRTC
    webrtcManager.closeAll();

    // Reset client state
    setInRoom(false);
    setParticipants([]);
    setRemoteStreams({});
    setIsMuted(false);
    setIsLocalSpeaking(false);
    setConnectionStatus('disconnected');
    roomCredentialsRef.current = { roomId: '', displayName: '' };
  };

  return (
    <main className="app-main-layout">
      {/* Play remote audio elements in the background */}
      {Object.entries(remoteStreams).map(([socketId, stream]) => (
        <AudioPlayer key={socketId} stream={stream} />
      ))}

      <div className="app-container">
        {!inRoom ? (
          <JoinRoomForm 
            onJoin={handleJoinRoom} 
            micError={micError} 
          />
        ) : (
          <div className="consultation-room animate-scale-up">
            <RoomHeader 
              roomId={roomId} 
              connectionStatus={connectionStatus} 
            />

            <div className="room-content">
              <ParticipantList 
                participants={participants} 
                localParticipant={{
                  socketId: socket.id,
                  displayName: displayName,
                  isSpeaking: isLocalSpeaking,
                  isMuted: isMuted
                }}
              />
            </div>

            <VoiceControls 
              isMuted={isMuted} 
              onToggleMute={handleToggleMute} 
              onLeave={handleLeaveRoom} 
            />
          </div>
        )}
      </div>
    </main>
  );
}
