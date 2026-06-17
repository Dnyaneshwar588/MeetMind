import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRecorder } from '../hooks/useRecorder';
import { VideoGrid } from '../components/Meeting/VideoGrid';
import { Controls } from '../components/Meeting/Controls';
import { ChatPanel } from '../components/Meeting/ChatPanel';
import { TranscriptPanel } from '../components/Meeting/TranscriptPanel';
import { Bot, MessageSquare, MessageSquareQuote, Copy, Check, Users, Clock } from 'lucide-react';

export const Meeting = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [copied, setCopied] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState('chat'); // chat, transcript
  const [liveTranscripts, setLiveTranscripts] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Local toggles
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Timestamps for browser speech segments
  const meetingStartTimeRef = useRef(Date.now());
  const recognitionRef = useRef(null);

  // Interval effect to track elapsed time in meeting
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - meetingStartTimeRef.current) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const formatElapsedTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const parts = [];
    if (hrs > 0) {
      parts.push(hrs.toString().padStart(2, '0'));
    }
    parts.push(mins.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));
    
    return parts.join(':');
  };

  // 1. Socket initialization
  const { socket, isConnected } = useSocket(token);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!token) {
      localStorage.setItem('redirectPath', `/meeting/${roomId}`);
      navigate('/login');
    }
  }, [token, roomId, navigate]);

  // 2. WebRTC call coordination
  const { localStream, peers, toggleAudio, toggleVideo } = useWebRTC(roomId, user.id, user.name, socket);

  // 3. Meeting chunk recorder coordination
  const { isRecording, startRecording, stopRecording } = useRecorder(localStream, roomId, token);

  // 4. In-meeting browser-based Speech Recognition
  useEffect(() => {
    if (!socket || !isConnected) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser. Live transcription is disabled.');
      return;
    }

    meetingStartTimeRef.current = Date.now();
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const resultIndex = event.resultIndex;
      const transcriptText = event.results[resultIndex][0].transcript.trim();
      
      if (transcriptText) {
        const endTime = (Date.now() - meetingStartTimeRef.current) / 1000;
        // Assume speech took roughly 3 seconds for start stamp fallback
        const startTime = Math.max(0, endTime - 3);

        console.log(`Speech detected: "${transcriptText}" [${startTime}s - ${endTime}s]`);
        
        // Emit segment to room via socket
        socket.emit('transcript:segment', {
          roomId,
          text: transcriptText,
          start: startTime,
          end: endTime
        });

        // Add to local display immediately
        setLiveTranscripts((prev) => [
          ...prev,
          { userName: user.name, text: transcriptText, start: startTime, end: endTime }
        ]);
      }
    };

    recognition.onend = () => {
      // Keep restarting recognition to transcribe continuously throughout the meeting
      if (audioEnabled) {
        try {
          recognition.start();
        } catch (e) {
          // already running
        }
      }
    };

    recognition.onerror = (err) => {
      console.error('Speech recognition error:', err.error);
    };

    recognitionRef.current = recognition;

    // Start recognition if audio is enabled
    if (audioEnabled) {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [socket, isConnected, audioEnabled]);

  // Handle incoming live transcripts from other users in the room
  useEffect(() => {
    if (!socket) return;

    socket.on('transcript:live', (segment) => {
      setLiveTranscripts((prev) => [...prev, segment]);
    });

    // Handle background analysis finished notice
    socket.on('meeting:processed', ({ meetingId, status }) => {
      console.log('Background job complete notice:', meetingId, status);
      if (status === 'done') {
        alert('LLaMA AI meeting analysis completed! You can view the full report on the dashboard.');
      }
    });

    return () => {
      socket.off('transcript:live');
      socket.off('meeting:processed');
    };
  }, [socket]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAudio = () => {
    const nextVal = !audioEnabled;
    setAudioEnabled(nextVal);
    toggleAudio(nextVal);
    
    // Toggle local speech-to-text
    if (recognitionRef.current) {
      if (nextVal) {
        try {
          recognitionRef.current.start();
        } catch {}
      } else {
        recognitionRef.current.stop();
      }
    }
  };

  const handleToggleVideo = () => {
    const nextVal = !videoEnabled;
    setVideoEnabled(nextVal);
    toggleVideo(nextVal);
  };

  const handleToggleScreenShare = () => {
    alert('Screen sharing is mocked. Media streams will continue using camera capture.');
    setIsScreenSharing(!isScreenSharing);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleLeave = () => {
    if (isRecording) {
      if (confirm('Meeting is recording. Do you want to stop recording and leave?')) {
        stopRecording().then(() => {
          navigate('/dashboard');
        });
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6">
      
      {/* Header bar */}
      <header className="glass-panel py-3 px-6 rounded-2xl flex items-center justify-between border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" style={{ width: '48px', height: '48px', flexShrink: 0 }} className="object-contain" alt="MeetMind Logo" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Room: {roomId?.substring(0, 8)}...</h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Users size={10} className="text-indigo-400" />
              <span>{1 + peers.length} Participant{1 + peers.length !== 1 ? 's' : ''}</span>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1 font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                <Clock size={10} className="text-indigo-400" />
                <span>{formatElapsedTime(elapsedTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Share room link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 text-[10px] font-semibold text-slate-350 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Link Copied' : 'Copy Room URL'}</span>
          </button>
        </div>
      </header>

      {/* Main workspace (Grid and sidebar) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
        {/* Videos block */}
        <div className="lg:col-span-2 space-y-6">
          <VideoGrid localStream={localStream} peers={peers} localName={user.name} />
        </div>

        {/* Sidebar tabs (Chatbot & Transcription logs) */}
        <div className="flex flex-col gap-4">
          
          {/* Tab selector */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-1.5 flex gap-2">
            <button
              onClick={() => setActiveSidePanel('chat')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeSidePanel === 'chat'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot size={13} />
              <span>AI Chat</span>
            </button>
            <button
              onClick={() => setActiveSidePanel('transcript')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeSidePanel === 'transcript'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquareQuote size={13} />
              <span>Live Script</span>
            </button>
          </div>

          {activeSidePanel === 'chat' ? (
            <ChatPanel
              socket={socket}
              roomId={roomId}
              userId={user.id}
              userName={user.name}
            />
          ) : (
            <TranscriptPanel liveTranscripts={liveTranscripts} />
          )}

        </div>
      </div>

      {/* Action controls footer */}
      <footer>
        <Controls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onLeave={handleLeave}
        />
      </footer>
    </div>
  );
};

export default Meeting;
