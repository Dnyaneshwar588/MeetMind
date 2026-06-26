import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';

export const useWebRTC = (roomId, userId, userName, socket) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]); // Array of { userId, userName, socketId, stream }
  
  const peersRef = useRef({}); // socketId -> peerObj
  const localStreamRef = useRef(null);
  const socketRef = useRef(socket);

  // Keep socket ref updated
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    let isMounted = true;

    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Once local media is acquired, join the room
        socket.emit('room:join', { roomId, userId, userName });
      } catch (err) {
        console.error('Failed to get local media stream:', err);
        // Fallback: join room without media (audio/video off)
        if (isMounted) {
          socket.emit('room:join', { roomId, userId, userName });
        }
      }
    };

    initLocalMedia();

    // 1. Receive existing users in the room (I am the initiator)
    socket.on('room:users', (existingUsers) => {
      if (!isMounted) return;
      console.log('Existing users in room:', existingUsers);

      const newPeers = [];
      existingUsers.forEach((user) => {
        const peer = createPeer(user.socketId, socket.id, localStreamRef.current, true);
        peersRef.current[user.socketId] = peer;
        
        newPeers.push({
          userId: user.userId,
          userName: user.userName,
          socketId: user.socketId,
          stream: null, // Stream will be added on 'stream' event
          peerObj: peer
        });
      });
      setPeers(newPeers);
    });

    // 2. A new user joined (I am the receiver/responder)
    socket.on('user:joined', ({ userId: joinedUserId, socketId, userName: joinedUserName }) => {
      if (!isMounted) return;
      console.log('New user joined:', joinedUserName, socketId);

      const peer = createPeer(socketId, socket.id, localStreamRef.current, false);
      peersRef.current[socketId] = peer;

      setPeers((prevPeers) => {
        // Prevent duplicate peer items
        if (prevPeers.some(p => p.socketId === socketId)) return prevPeers;
        return [
          ...prevPeers,
          {
            userId: joinedUserId,
            userName: joinedUserName,
            socketId,
            stream: null,
            peerObj: peer
          }
        ];
      });
    });

    // 3. WebRTC signaling handlers
    socket.on('webrtc:offer', ({ fromSocketId, offer }) => {
      const peer = peersRef.current[fromSocketId];
      if (peer) {
        peer.signal(offer);
      }
    });

    socket.on('webrtc:answer', ({ fromSocketId, answer }) => {
      const peer = peersRef.current[fromSocketId];
      if (peer) {
        peer.signal(answer);
      }
    });

    socket.on('webrtc:ice', ({ fromSocketId, candidate }) => {
      const peer = peersRef.current[fromSocketId];
      if (peer) {
        peer.signal(candidate);
      }
    });

    // 4. User leaves
    socket.on('user:left', ({ socketId }) => {
      console.log('User left room:', socketId);
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].destroy();
        delete peersRef.current[socketId];
      }
      setPeers((prevPeers) => prevPeers.filter((p) => p.socketId !== socketId));
    });

    return () => {
      isMounted = false;
      // Clean up socket listeners
      socket.off('room:users');
      socket.off('user:joined');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice');
      socket.off('user:left');

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Destroy all peer connections
      Object.keys(peersRef.current).forEach((socketId) => {
        peersRef.current[socketId].destroy();
      });
      peersRef.current = {};
      
      // Let backend know we left
      socket.emit('room:leave', { roomId, userId });
    };
  }, [roomId, userId, userName, socket]);

  // Peer creation helper
  const createPeer = (targetSocketId, mySocketId, stream, isInitiator) => {
    const peer = new Peer({
      initiator: isInitiator,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.relay.metered.ca:80' },
          // Free TURN servers via Open Relay Project (metered.ca)
          {
            urls: 'turn:global.relay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:global.relay.metered.ca:80?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:global.relay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:global.relay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    });

    // On ICE candidate or routing generation, forward signal payload
    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socketRef.current?.emit('webrtc:offer', { to: targetSocketId, from: userId, offer: data });
      } else if (data.type === 'answer') {
        socketRef.current?.emit('webrtc:answer', { to: targetSocketId, from: userId, answer: data });
      } else {
        // candidate
        socketRef.current?.emit('webrtc:ice', { to: targetSocketId, from: userId, candidate: data });
      }
    });

    // On remote stream received
    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream from socket:', targetSocketId);
      setPeers((prevPeers) =>
        prevPeers.map((p) =>
          p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p
        )
      );
    });

    peer.on('error', (err) => {
      console.error('Peer error for socket:', targetSocketId, err);
    });

    return peer;
  };

  const toggleAudio = (enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  };

  const toggleVideo = (enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  };

  return {
    localStream,
    peers,
    toggleAudio,
    toggleVideo
  };
};
