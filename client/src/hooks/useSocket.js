import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    
    const socket = io(socketUrl, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket'] // Force websocket for fast transmission
    });

    socket.connect();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.io connected successfully');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.io disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.io connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  return { socket: socketRef.current, isConnected };
};
