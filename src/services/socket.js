import { io } from 'socket.io-client';

// Get backend URL from environment variables, fallback to current origin in production or port 5000 in dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket']
});

export default socket;
