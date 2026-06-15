import React, { useEffect, useRef } from 'react';
import { MessageSquareQuote } from 'lucide-react';

export const TranscriptPanel = ({ liveTranscripts }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscripts]);

  const formatTime = (secs) => {
    if (typeof secs !== 'number' || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[calc(100vh-280px)] border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-2">
        <MessageSquareQuote size={18} className="text-cyan-400" />
        <h3 className="font-semibold text-slate-200 text-sm">Live Transcript</h3>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {liveTranscripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
            <span className="pulse-active mb-1">Listening to meeting audio...</span>
            <span>Spoken segments will show here in real-time.</span>
          </div>
        ) : (
          liveTranscripts.map((segment, index) => (
            <div key={index} className="flex flex-col gap-1 border-l-2 border-indigo-500/20 pl-3 py-0.5 hover:border-indigo-500/50 transition-colors">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span className="text-indigo-400">{segment.userName}</span>
                <span>{formatTime(segment.start)}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {segment.text}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TranscriptPanel;
