import { roomManager } from '../rooms/roomManager.js';

export default function setupSignaling(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // 1. Room joining
    socket.on('join-room', ({ roomId, displayName }) => {
      if (!roomId || !displayName) {
        socket.emit('error-msg', 'Room ID and Display Name are required.');
        return;
      }

      console.log(`User [${displayName}] (${socket.id}) joining room: ${roomId}`);
      
      // Join the socket room
      socket.join(roomId);

      // Get existing users BEFORE adding this user, or just get all users
      const allUsers = roomManager.getRoomUsers(roomId);
      
      // Add user to room manager
      const roomUsers = roomManager.joinRoom(roomId, socket.id, displayName);

      // Notify other users in the room that a new user connected
      socket.to(roomId).emit('user-connected', {
        socketId: socket.id,
        displayName
      });

      // Send the list of existing users to the newly joined user so they can initiate connections
      // We exclude the new user themselves from this list
      const existingUsers = allUsers.filter(u => u.socketId !== socket.id);
      socket.emit('room-users', existingUsers);
      
      console.log(`Room [${roomId}] current users:`, roomUsers.map(u => u.displayName));
    });

    // 2. WebRTC SDP Offer forwarding
    // 'to' is the socketId of the target recipient
    socket.on('offer', ({ to, offer }) => {
      console.log(`Forwarding WebRTC offer from [${socket.id}] to [${to}]`);
      io.to(to).emit('offer', {
        from: socket.id,
        offer
      });
    });

    // 3. WebRTC SDP Answer forwarding
    // 'to' is the socketId of the target recipient
    socket.on('answer', ({ to, answer }) => {
      console.log(`Forwarding WebRTC answer from [${socket.id}] to [${to}]`);
      io.to(to).emit('answer', {
        from: socket.id,
        answer
      });
    });

    // 4. WebRTC ICE Candidate forwarding
    // 'to' is the socketId of the target recipient
    socket.on('ice-candidate', ({ to, candidate }) => {
      console.log(`Forwarding ICE candidate from [${socket.id}] to [${to}]`);
      io.to(to).emit('ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    // 5. Mute/Unmute state broadcast
    socket.on('mute-state-change', ({ isMuted }) => {
      const result = roomManager.updateMuteStatus(socket.id, isMuted);
      if (result) {
        const { roomId } = result;
        socket.to(roomId).emit('mute-state-change', {
          socketId: socket.id,
          isMuted
        });
      }
    });

    // 6. Speaking status state broadcast
    socket.on('speaking-state-change', ({ isSpeaking }) => {
      const result = roomManager.updateSpeakingStatus(socket.id, isSpeaking);
      if (result) {
        const { roomId } = result;
        socket.to(roomId).emit('speaking-state-change', {
          socketId: socket.id,
          isSpeaking
        });
      }
    });

    // 7. Manual Leave Room
    socket.on('leave-room', () => {
      handleUserLeaving(socket);
    });

    // 8. Handle Disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      handleUserLeaving(socket);
    });
  });
}

/**
 * Handles cleaning up a user when they leave or disconnect.
 */
function handleUserLeaving(socket) {
  const result = roomManager.leaveRoom(socket.id);
  if (result) {
    const { roomId, leftUser } = result;
    if (leftUser) {
      console.log(`User [${leftUser.displayName}] (${socket.id}) left room: ${roomId}`);
      // Notify remaining users
      socket.to(roomId).emit('user-disconnected', {
        socketId: socket.id,
        displayName: leftUser.displayName
      });
    }
    socket.leave(roomId);
  }
}
