class RoomManager {
  constructor() {
    // Map of roomId -> Map of socketId -> { socketId, displayName, isSpeaking, isMuted }
    this.rooms = new Map();
    // Map of socketId -> roomId (for quick lookup when a socket disconnects)
    this.userRooms = new Map();
  }

  /**
   * Adds a user to a room, creating the room if it doesn't exist.
   * Returns the list of all participants in the room.
   */
  joinRoom(roomId, socketId, displayName) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const room = this.rooms.get(roomId);
    room.set(socketId, {
      socketId,
      displayName,
      isSpeaking: false,
      isMuted: false
    });

    this.userRooms.set(socketId, roomId);
    return Array.from(room.values());
  }

  /**
   * Removes a user from a room.
   * Returns the roomId and the user details of the user who left, or null.
   */
  leaveRoom(socketId) {
    const roomId = this.userRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    let leftUser = null;
    if (room) {
      leftUser = room.get(socketId);
      room.delete(socketId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.userRooms.delete(socketId);
    return { roomId, leftUser };
  }

  /**
   * Returns all users in a given room.
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values()) : [];
  }

  /**
   * Gets the roomId associated with a socket ID.
   */
  getUserRoom(socketId) {
    return this.userRooms.get(socketId);
  }

  /**
   * Updates the speaking status of a user.
   */
  updateSpeakingStatus(socketId, isSpeaking) {
    const roomId = this.userRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (room && room.has(socketId)) {
      const user = room.get(socketId);
      user.isSpeaking = isSpeaking;
      return { roomId, user };
    }
    return null;
  }

  /**
   * Updates the mute status of a user.
   */
  updateMuteStatus(socketId, isMuted) {
    const roomId = this.userRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (room && room.has(socketId)) {
      const user = room.get(socketId);
      user.isMuted = isMuted;
      return { roomId, user };
    }
    return null;
  }
}

export const roomManager = new RoomManager();
