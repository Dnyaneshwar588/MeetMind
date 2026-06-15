const jwt = require('jsonwebtoken');
const { redis } = require('../services/redisService');
const uuid = require('uuid');

module.exports = (io) => {
  // Authentication middleware on connection handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: JWT Token required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.user = decoded; // id, email, name
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // In-memory room manager: roomId -> Map(userId -> { socketId, userName })
  const rooms = new Map();

  // Setup Redis Pub/Sub subscription for background job completion notices
  if (redis) {
    const Redis = require('ioredis');
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true
    });
    
    subscriber.connect().then(() => {
      subscriber.subscribe('meeting:updates', (err) => {
        if (err) {
          console.error('Failed to subscribe to meeting:updates channel:', err.message);
        } else {
          console.log('Successfully subscribed to meeting:updates channel.');
        }
      });

      subscriber.on('message', (channel, message) => {
        if (channel === 'meeting:updates') {
          const { roomId, meetingId, status } = JSON.parse(message);
          // Broadcast to the meeting room that the meeting processing status changed
          io.to(roomId).emit('meeting:processed', { meetingId, status });
          console.log(`Meeting processed broadcast sent to room ${roomId}: ${meetingId} status: ${status}`);
        }
      });
    }).catch(err => {
      console.warn('Redis Pub/Sub subscriber connection failed. Live updates might not be broadcasted via sockets.', err.message);
    });
  }


  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // 1. Room joining
    socket.on('room:join', ({ roomId, userId, userName }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = userName;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const roomUsers = rooms.get(roomId);

      // Collect current active users to send back to the joining participant
      const existingUsers = [];
      roomUsers.forEach((userInfo, idKey) => {
        existingUsers.push({
          userId: idKey,
          socketId: userInfo.socketId,
          userName: userInfo.userName
        });
      });

      // Add joiner
      roomUsers.set(userId, { socketId: socket.id, userName });

      // Send list of current users to joining user
      socket.emit('room:users', existingUsers);

      // Alert other users in the room
      socket.to(roomId).emit('user:joined', {
        userId,
        socketId: socket.id,
        userName
      });
      
      console.log(`User ${userName} (${userId}) joined room ${roomId}`);
    });

    // 2. WebRTC Signaling Forwarders
    socket.on('webrtc:offer', ({ to, from, offer }) => {
      io.to(to).emit('webrtc:offer', {
        fromSocketId: socket.id,
        fromUserId: from,
        offer
      });
    });

    socket.on('webrtc:answer', ({ to, from, answer }) => {
      io.to(to).emit('webrtc:answer', {
        fromSocketId: socket.id,
        fromUserId: from,
        answer
      });
    });

    socket.on('webrtc:ice', ({ to, from, candidate }) => {
      io.to(to).emit('webrtc:ice', {
        fromSocketId: socket.id,
        fromUserId: from,
        candidate
      });
    });

    // 3. Live Transcript segment
    socket.on('transcript:segment', async ({ roomId, text, start, end }) => {
      try {
        const userName = socket.userName || socket.user.name || 'Participant';
        
        // Cache segment in Redis for AI chatbot context (last 15 segments)
        if (redis) {
          const segmentData = JSON.stringify({ text, start, end, userName });
          await redis.rpush(`transcript:${roomId}`, segmentData);
          await redis.expire(`transcript:${roomId}`, 7200); // Expires in 2 hours
          await redis.ltrim(`transcript:${roomId}`, -15, -1);
        }

        // Broadcast to other users in real time
        socket.to(roomId).emit('transcript:live', {
          userName,
          text,
          start,
          end
        });
      } catch (err) {
        console.error('Error processing transcript segment:', err);
      }
    });

    // 4. In-Meeting AI Chatbot Question
    socket.on('chat:question', async ({ roomId, userId, userName, message }) => {
      try {
        let segments = [];
        if (redis) {
          const segmentsRaw = await redis.lrange(`transcript:${roomId}`, 0, -1);
          segments = segmentsRaw.map(s => JSON.parse(s));
        }

        const formatTime = (secs) => {
          const m = Math.floor(secs / 60);
          const s = Math.floor(secs % 60);
          return `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        const transcriptContext = segments.length > 0
          ? segments.map(s => `[${formatTime(s.start)}] ${s.userName}: ${s.text}`).join('\n')
          : 'No live transcription segments are available yet.';

        const messages = [
          {
            role: 'system',
            content: `You are an AI assistant in a live video meeting called MeetMind.
Here is the meeting transcript so far:
${transcriptContext}
Answer questions using this context when relevant.
For general questions (coding, definitions, calculations, etc.), answer from your knowledge.
Be concise, helpful, and friendly. Limit answers to 3-4 sentences if possible.`
          },
          { role: 'user', content: message }
        ];

        const answerId = uuid.v4();

        // 1. Notify the room that AI is starting to generate response
        io.to(roomId).emit('chat:response:start', {
          userId,
          userName,
          message,
          answerId
        });

        const { streamChatResponse } = require('../services/groqService');

        // 2. Stream tokens via Socket.io
        await streamChatResponse(
          messages,
          (token) => {
            io.to(roomId).emit('chat:token', { token, done: false, answerId });
          },
          async () => {
            io.to(roomId).emit('chat:token', { token: '', done: true, answerId });

            // Save QA entry in Redis
            if (redis) {
              const chatRecord = JSON.stringify({
                question: message,
                answerId,
                askedBy: userName,
                timestamp: Date.now()
              });
              await redis.rpush(`chatlog:${roomId}`, chatRecord);
              await redis.expire(`chatlog:${roomId}`, 7200);
            }
          }
        );
      } catch (err) {
        console.error('Chat bot request failed:', err);
        io.to(roomId).emit('chat:token', { token: '\n[Error processing request]', done: true });
      }
    });

    // 5. Room leaving
    socket.on('room:leave', ({ roomId, userId }) => {
      socket.leave(roomId);
      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId);
        roomUsers.delete(userId);
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        }
      }
      socket.to(roomId).emit('user:left', { userId, socketId: socket.id });
      
      socket.roomId = null;
      socket.userId = null;
      console.log(`User ${userId} left room ${roomId}`);
    });

    // 6. Handle abrupt disconnection
    socket.on('disconnect', () => {
      const { roomId, userId } = socket;
      if (roomId && userId) {
        if (rooms.has(roomId)) {
          const roomUsers = rooms.get(roomId);
          roomUsers.delete(userId);
          if (roomUsers.size === 0) {
            rooms.delete(roomId);
          }
        }
        socket.to(roomId).emit('user:left', { userId, socketId: socket.id });
        console.log(`User ${userId} disconnected from room ${roomId}`);
      }
    });
  });
};
