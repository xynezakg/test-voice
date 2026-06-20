import { socket } from './socket.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]
};

class WebRTCManager {
  constructor() {
    this.localStream = null;
    this.peers = new Map(); // targetSocketId -> RTCPeerConnection
    this.iceQueues = new Map(); // targetSocketId -> Array of RTCIceCandidate
    
    // Callbacks for React UI updates
    this.onLocalStreamReady = null;
    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.onSpeakingStateChange = null;
    
    // Audio analysis for speaking detection
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.speakingInterval = null;
    this.isLocalSpeaking = false;
  }

  /**
   * Request microphone permission and get local audio stream
   */
  async getLocalMedia() {
    if (this.localStream) return this.localStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream = stream;
      
      if (this.onLocalStreamReady) {
        this.onLocalStreamReady(stream);
      }
      
      this.startSpeakingDetection(stream);
      return stream;
    } catch (err) {
      console.error("Microphone access error:", err);
      throw new Error(err.message || "Could not access microphone. Please check permissions.");
    }
  }

  /**
   * Stop local audio stream and clean up media devices
   */
  stopLocalMedia() {
    this.stopSpeakingDetection();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Set local mute status
   */
  setMuted(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      // Notify signaling server of mute state change
      socket.emit('mute-state-change', { isMuted });
    }
  }

  /**
   * Connect to a specific peer using WebRTC
   */
  createPeerConnection(targetSocketId, isInitiator) {
    console.log(`Creating RTCPeerConnection with [${targetSocketId}], isInitiator: ${isInitiator}`);
    
    // Close existing connection if any
    this.closePeerConnection(targetSocketId);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(targetSocketId, pc);

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates found by our browser
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle incoming audio tracks from the remote peer
    pc.ontrack = (event) => {
      console.log(`Received remote track from [${targetSocketId}]`);
      let stream = event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }
      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(targetSocketId, stream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`ICE connection state with [${targetSocketId}] changed to: ${state}`);
      if (state === 'failed' || state === 'closed') {
        this.closePeerConnection(targetSocketId);
        if (this.onRemoteStreamRemoved) {
          this.onRemoteStreamRemoved(targetSocketId);
        }
      }
    };

    // If initiator, create and send an SDP offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('offer', {
            to: targetSocketId,
            offer: pc.localDescription
          });
        })
        .catch(err => console.error(`Error creating offer to [${targetSocketId}]:`, err));
    }

    return pc;
  }

  /**
   * Process any ICE candidates that were received and queued before remote description was set.
   */
  async processIceQueue(socketId) {
    const pc = this.peers.get(socketId);
    if (!pc || !pc.remoteDescription) return;

    const queue = this.iceQueues.get(socketId);
    if (queue && queue.length > 0) {
      console.log(`Processing ${queue.length} queued ICE candidates for [${socketId}]`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(`Error adding queued ICE candidate for [${socketId}]:`, err);
        }
      }
      this.iceQueues.set(socketId, []); // Clear queue
    }
  }

  /**
   * Handle receiving an SDP offer from another peer
   */
  async handleOffer(fromSocketId, offer) {
    console.log(`Handling WebRTC offer from [${fromSocketId}]`);
    let pc = this.peers.get(fromSocketId);
    
    if (!pc) {
      // If we don't have a peer connection yet, create one (not initiator)
      pc = this.createPeerConnection(fromSocketId, false);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any ICE candidates queued for this sender
      await this.processIceQueue(fromSocketId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('answer', {
        to: fromSocketId,
        answer: pc.localDescription
      });
    } catch (err) {
      console.error(`Error handling offer from [${fromSocketId}]:`, err);
    }
  }

  /**
   * Handle receiving an SDP answer from another peer
   */
  async handleAnswer(fromSocketId, answer) {
    console.log(`Handling WebRTC answer from [${fromSocketId}]`);
    const pc = this.peers.get(fromSocketId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any ICE candidates queued for this sender
        await this.processIceQueue(fromSocketId);
      } catch (err) {
        console.error(`Error setting remote description from [${fromSocketId}]:`, err);
      }
    }
  }

  /**
   * Handle receiving an ICE candidate from another peer
   */
  async handleIceCandidate(fromSocketId, candidate) {
    const pc = this.peers.get(fromSocketId);
    
    // If the peer connection doesn't exist or remote description isn't set yet, queue the candidate.
    // Calling addIceCandidate before setRemoteDescription throws a DOMException in modern browsers.
    if (!pc || !pc.remoteDescription) {
      console.log(`Queueing ICE candidate from [${fromSocketId}] (remote description not set yet)`);
      if (!this.iceQueues.has(fromSocketId)) {
        this.iceQueues.set(fromSocketId, []);
      }
      this.iceQueues.get(fromSocketId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`Error adding ICE candidate from [${fromSocketId}]:`, err);
    }
  }

  /**
   * Close connection with a specific peer
   */
  closePeerConnection(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
      this.iceQueues.delete(socketId); // Clear queue references
      console.log(`RTCPeerConnection closed for [${socketId}]`);
    }
  }

  /**
   * Clean up all peer connections and media
   */
  closeAll() {
    this.stopLocalMedia();
    for (const [socketId, pc] of this.peers.entries()) {
      pc.close();
    }
    this.peers.clear();
    console.log("All WebRTC peer connections closed.");
  }

  /**
   * Web Audio API speaking detection (runs locally)
   */
  startSpeakingDetection(stream) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.speakingInterval = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Threshold: 15 on a scale of 0-255 (adjust as needed for ambient noise)
        const isSpeaking = rms > 15;

        if (isSpeaking !== this.isLocalSpeaking) {
          this.isLocalSpeaking = isSpeaking;
          // Emit local speaking state to the server
          socket.emit('speaking-state-change', { isSpeaking });
          if (this.onSpeakingStateChange) {
            this.onSpeakingStateChange(socket.id, isSpeaking);
          }
        }
      }, 150);
    } catch (err) {
      console.warn("Could not start speaking detection:", err);
    }
  }

  stopSpeakingDetection() {
    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
    this.isLocalSpeaking = false;
  }
}

export const webrtcManager = new WebRTCManager();
export default webrtcManager;
