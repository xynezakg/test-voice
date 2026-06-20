# Voice Consultation Room (WebRTC + Socket.IO)

A real-time, voice-only consultation room application built from scratch using **React (Vite)**, **Node.js (Express)**, **Socket.IO**, and **native WebRTC**. 

This application supports multi-party audio calls (2-5 participants) utilizing a WebRTC full-mesh network. It incorporates real-time microphone muting, leave/join rooms, active connection indicators, and speaking/voice-activity detection.

---

## 📂 Project Structure

Here is the complete project directory structure:

```text
Test-Voice/
├── server/                     # Backend Server (Node.js + Express)
│   ├── rooms/
│   │   └── roomManager.js      # In-memory Room & Participant manager
│   ├── socket/
│   │   └── signaling.js        # Socket.IO signaling event handlers
│   ├── .env                    # Backend environment config
│   ├── package.json            # Backend package definitions
│   └── server.js               # Backend entry point
│
├── src/                        # Frontend Client (React + Vite)
│   ├── components/
│   │   ├── JoinRoomForm.jsx    # User details & room validation + mic check
│   │   ├── ParticipantList.jsx # Participant grid with speaking & mute indicators
│   │   ├── RoomHeader.jsx      # Title, copyable Room ID, connection status
│   │   └── VoiceControls.jsx   # Microphones controls (mute/unmute, leave room)
│   ├── pages/
│   │   └── VoiceRoom.jsx       # Coordinates page views, audio streams, and WebRTC logic
│   ├── services/
│   │   ├── socket.js           # Client Socket.IO configuration
│   │   └── webrtc.js           # P2P PeerConnection manager and voice analysis
│   ├── App.jsx                 # App component routing
│   ├── index.css               # Premium CSS glassmorphic style design
│   └── main.jsx                # React mount entry
│
├── .env                        # Frontend environment config
├── package.json                # Frontend package definitions
├── vite.config.js              # Vite build config
└── README.md                   # Project documentation
```

---

## 🛠️ Installation & Setup

Follow these steps to run both the frontend and backend locally.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Install Backend Dependencies
Navigate to the `server/` directory and install the required modules:
```bash
cd server
npm install
```

### 2. Install Frontend Dependencies
Navigate back to the root directory and install the React app dependencies:
```bash
cd ..
npm install
```

---

## 🚀 Running the Application

For a smooth local development experience, it is recommended to run the backend and frontend in separate terminal windows.

### Step 1: Start the Backend Server
From the `server/` directory, start the development server using `nodemon`:
```bash
cd server
npm run dev
```
The backend will run on **`http://localhost:5000`**.

### Step 2: Start the Frontend Client
From the root workspace directory, start the Vite development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser. To test voice features, open another browser tab or window (incognito or another browser), join the **same room**, and verify real-time voice communication!

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
Create a file named `.env` inside the `server/` folder:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
Create a file named `.env` in the root workspace directory:
```env
VITE_BACKEND_URL=http://localhost:5000
```

---

## 📡 WebRTC & Signaling Flow Explanation

### Step-by-Step Signaling Process

1. **Join Room request**:
   When a user clicks "Join Room", they emit a `join-room` event via the signaling socket containing their target Room ID and chosen Display Name.
2. **Server Room registration**:
   The backend server processes the join request, adds the user to the `roomManager`, adds the socket to the corresponding Socket.IO room, and responds to the joining user with a `room-users` list containing all other participants currently active in the room. Simultaneously, the server broadcasts `user-connected` to notify all other participants.
3. **WebRTC Initiation**:
   The newly joined user is designated as the initiator for all connections to prevent conflicts. For each existing participant returned in the `room-users` list, the joining user creates an `RTCPeerConnection` instance, attaches their local microphone tracks, creates a WebRTC SDP Offer, sets it locally, and sends it to the target participant's socket ID via the `offer` event.
4. **SDP Handshake**:
   The target participant receives the WebRTC Offer via the signaling server. They create their own `RTCPeerConnection` for the new peer, attach their local audio tracks, apply the remote description, generate a WebRTC SDP Answer, set it locally, and send it back to the initiator via the `answer` signaling event.
5. **ICE Candidates Exchange**:
   Both peers automatically begin seeking networking paths (ICE candidates) using the STUN servers. When candidates are discovered, they are forwarded directly to the opposing peer via the `ice-candidate` signaling event and appended to the respective peer connection.
6. **Audio Stream Established**:
   Once SDP parameters and ICE routes are resolved, a direct P2P connection is established. Remote tracks are played through a hidden HTML `<audio>` player inside the React application.
7. **Speaking Detection**:
   An `AudioContext` and `AnalyserNode` analyze local microphone input in real-time. If volume peaks, a `speaking-state-change` is broadcasted via Socket.IO, triggering animation rings in the participants' lists.
8. **Teardown**:
   When a user clicks "Leave Room" or closes the tab, the socket disconnects. The server removes them from the `roomManager` and emits a `user-disconnected` event to the room, letting all remaining participants safely close and delete their `RTCPeerConnection` resources.
