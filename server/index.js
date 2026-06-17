require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const uploadRoutes = require('./routes/upload');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL
].filter(Boolean);

// Initialize Socket.io server with CORS configurations
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload directory fallback
const uploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/upload', uploadRoutes);

// Root test route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'MeetMind Server is online!' });
});

// Bind Socket.io events
socketHandler(io);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meetmind';
console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully.');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// Run server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket server is ready for room connections.`);
});
