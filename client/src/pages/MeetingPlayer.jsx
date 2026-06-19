import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Volume2, Maximize, Clock, FileText, CheckSquare, Award, MessageSquare, Plus, ChevronLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const MeetingPlayer = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Video player controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef(null);

  // Annotation form
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // summary, actionItems, decisions

  // Fetch token from localStorage
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchMeeting = async () => {
      try {
        const res = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to load meeting details.');
        }

        const data = await res.json();
        setMeeting(data.meeting);
        setAnnotations(data.annotations);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error loading meeting details.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, token, navigate]);

  // Video time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Play/Pause control
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Seek video
  const handleProgressBarChange = (e) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Seek to specific segment/timestamp
  const seekTo = (timestamp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Volume control
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  // Fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  // Add Annotation
  const handleAddAnnotation = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/meetings/${meetingId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timestamp: currentTime,
          text: noteText.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save annotation.');
      }

      const data = await res.json();
      setAnnotations((prev) => [...prev, data.annotation].sort((a, b) => a.timestamp - b.timestamp));
      setNoteText('');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save annotation.');
    }
  };

  const formatTime = (secs) => {
    if (typeof secs !== 'number' || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resolveVideoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-height-screen flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Loading meeting record...</span>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-6 glass-card text-center">
        <h2 className="text-xl font-bold text-rose-500 mb-2">Error Loading Meeting</h2>
        <p className="text-slate-400 mb-6">{error || 'Meeting not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="glow-btn">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs mb-6 transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Dashboard</span>
        </button>

        {/* Title block */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">{meeting.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Host: <strong className="text-blue-400 font-semibold">{meeting.host?.name}</strong></span>
            <span>Date: <strong>{new Date(meeting.createdAt).toLocaleString()}</strong></span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${meeting.status === 'done'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse'
              }`}>
              {meeting.status}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* Left column: Video player & annotation timeline */}
          <div className="lg:col-span-2 space-y-6">

            {/* Custom Video Player Container */}
            <div className="relative bg-[#0d121f] border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
              {meeting.recordingUrl ? (
                <div className="relative group/player">
                  <video
                    ref={videoRef}
                    src={resolveVideoUrl(meeting.recordingUrl)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onClick={togglePlay}
                    className="w-full h-auto object-cover max-h-[500px]"
                  />

                  {/* Control bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-4 flex flex-col gap-3 opacity-0 group-hover/player:opacity-100 transition-opacity duration-350">

                    {/* Progress bar + Annotation Dots */}
                    <div className="relative w-full h-2 bg-slate-800/80 rounded-full cursor-pointer">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleProgressBarChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className="h-full bg-blue-500 rounded-full pointer-events-none relative"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      />

                      {/* Render dots for each annotation */}
                      {annotations.map((ann) => {
                        const percentage = duration > 0 ? (ann.timestamp / duration) * 100 : 0;
                        return (
                          <div
                            key={ann._id}
                            className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full border border-slate-950 cursor-pointer -translate-x-1/2 top-1/2 -translate-y-1/2 group/dot"
                            style={{ left: `${percentage}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              seekTo(ann.timestamp);
                            }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover/dot:block bg-slate-950/95 border border-slate-800 text-[10px] text-slate-250 px-2 py-1 rounded-md whitespace-nowrap shadow-2xl z-25 pointer-events-none">
                              <span className="font-bold text-blue-400 block">{ann.userId?.name}</span>
                              <span>{ann.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:text-blue-400 transition-colors">
                          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => {
                            if (videoRef.current) videoRef.current.currentTime = 0;
                          }}
                          className="hover:text-blue-400 transition-colors"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <span className="font-mono text-[11px] text-slate-300">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Volume2 size={15} className="text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 rounded-full accent-blue-500 cursor-pointer bg-slate-700"
                          />
                        </div>
                        <button onClick={handleFullscreen} className="hover:text-blue-400 transition-colors">
                          <Maximize size={15} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full flex flex-col items-center justify-center bg-slate-950/60 p-10 text-slate-500 text-center">
                  <span className="pulse-active text-sm mb-1 font-semibold text-blue-400">AI Pipeline Processing...</span>
                  <span className="text-xs">Recording is currently being compiled or transcribed by LLaMA 3.</span>
                </div>
              )}
            </div>

            {/* Add annotation input */}
            {meeting.recordingUrl && (
              <form onSubmit={handleAddAnnotation} className="bg-[#0d121f] border border-slate-900 p-5 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" />
                  <span>Add Marker Note at </span>
                  <span className="text-cyan-400 font-mono bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">{formatTime(currentTime)}</span>
                </h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type a note (e.g. 'Important point about marketing strategy')..."
                    className="flex-1 glass-input py-2.5 text-xs focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!noteText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>Add Note</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tabbed extraction section */}
            <div className="bg-[#0d121f] border border-slate-900 rounded-2xl overflow-hidden">
              {/* Tabs header */}
              <div className="flex border-b border-slate-900 bg-slate-950/20">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'summary'
                      ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <FileText size={14} />
                  <span>Executive Summary</span>
                </button>
                <button
                  onClick={() => setActiveTab('actionItems')}
                  className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'actionItems'
                      ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <CheckSquare size={14} />
                  <span>Action Items</span>
                </button>
                <button
                  onClick={() => setActiveTab('decisions')}
                  className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'decisions'
                      ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Award size={14} />
                  <span>Key Decisions</span>
                </button>
              </div>

              {/* Tabs body */}
              <div className="p-6 min-h-[160px]">
                {meeting.status !== 'done' ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                    <span className="pulse-active mb-1 font-semibold text-blue-400">AI analysis in progress...</span>
                    <span>Meeting insights are being generated by LLaMA 3.</span>
                  </div>
                ) : (
                  <>
                    {activeTab === 'summary' && (
                      <div className="text-slate-350 leading-relaxed font-light text-xs">
                        {meeting.summary || 'No summary extracted.'}
                      </div>
                    )}
                    {activeTab === 'actionItems' && (
                      <ul className="space-y-2.5">
                        {meeting.actionItems && meeting.actionItems.length > 0 ? (
                          meeting.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                              <span className="font-light">{item}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 text-xs italic">No action items extracted.</li>
                        )}
                      </ul>
                    )}
                    {activeTab === 'decisions' && (
                      <ul className="space-y-2.5">
                        {meeting.decisions && meeting.decisions.length > 0 ? (
                          meeting.decisions.map((decision, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                              <span className="font-light">{decision}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 text-xs italic">No key decisions extracted.</li>
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Timeline seekable transcript / marker annotations list */}
          <div className="space-y-6">

            {/* Transcript Seeking Panel */}
            <div className="bg-[#0d121f] border border-slate-900 rounded-2xl flex flex-col h-[400px] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-900 bg-slate-950/20 flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-400" />
                <h3 className="font-bold text-slate-200 text-xs">Seekable Transcript</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {!meeting.transcript || meeting.transcript.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                    <span>No transcription segments compiled.</span>
                  </div>
                ) : (
                  meeting.transcript.map((seg, i) => {
                    const isActive = currentTime >= seg.start && currentTime <= seg.end;
                    return (
                      <div
                        key={i}
                        onClick={() => seekTo(seg.start)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isActive
                            ? 'bg-blue-500/10 border-blue-500/35 text-slate-200 scale-[1.01]'
                            : 'bg-slate-900/20 border-slate-950 hover:bg-slate-900/40 hover:border-slate-800 text-slate-400'
                          }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-bold mb-1 opacity-70">
                          <span className="text-blue-400">Segment {i + 1}</span>
                          <span className="font-mono">{formatTime(seg.start)}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed font-light ${isActive ? 'text-blue-200' : 'text-slate-350'}`}>
                          {seg.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Marker Notes Listing */}
            <div className="bg-[#0d121f] border border-slate-900 rounded-2xl flex flex-col h-[300px] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-900 bg-slate-950/20 flex items-center gap-2">
                <Clock size={14} className="text-cyan-400" />
                <h3 className="font-bold text-slate-200 text-xs">Meeting Marker Notes</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {annotations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                    <span>No marker notes added yet.</span>
                  </div>
                ) : (
                  annotations.map((ann) => (
                    <div
                      key={ann._id}
                      onClick={() => seekTo(ann.timestamp)}
                      className="p-3 bg-slate-900/20 border border-slate-900 hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
                        <span className="text-cyan-400">{ann.userId?.name}</span>
                        <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 text-[8px]">
                          {formatTime(ann.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-light leading-relaxed">{ann.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default MeetingPlayer;
