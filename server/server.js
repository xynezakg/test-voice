import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import setupSignaling from './socket/signaling.js';

// Resolve current directory path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// API health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Serve frontend build static files in production if available
const buildPath = path.join(__dirname, '../dist');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
  // If a build folder exists, serve index.html, else return 404/health info
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Voice Consultation Server is running. Frontend dev server is on port 5173.');
    }
  });
});

// Create HTTP server and mount Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup signaling connection handlers
setupSignaling(io);

// Start listening
httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎙️ Voice Consultation Room backend is active.`);
  console.log(`==================================================`);
});
