import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Play, RefreshCw, AlertCircle, Copy, Check, ExternalLink, Trash2 } from 'lucide-react';

export const MeetingCard = ({ meeting, onDelete }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isHost = meeting.host?._id === currentUser.id || meeting.host === currentUser.id;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/meeting/${meeting.roomId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting? This will permanently delete the meeting record, video files, transcripts, annotations, and AI insights.')) {
      if (onDelete) {
        onDelete(meeting._id);
      }
    }
  };

  const handleCardClick = () => {
    if (meeting.status === 'done') {
      navigate(`/meeting/player/${meeting._id}`);
    } else if (meeting.status === 'live') {
      navigate(`/meeting/${meeting.roomId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`glass-card p-6 flex flex-col justify-between h-52 transition-all duration-300 relative overflow-hidden group border-slate-900/60 hover:border-slate-800 ${
        meeting.status === 'done' || meeting.status === 'live' ? 'cursor-pointer hover:translate-y-[-2px] hover:shadow-slate-950/20' : ''
      }`}
    >
      {/* Background glow effects */}
      <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${
        meeting.status === 'live' ? 'bg-emerald-500' : meeting.status === 'done' ? 'bg-blue-500' : 'bg-slate-500'
      }`} />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
              meeting.status === 'live'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : meeting.status === 'processing'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : meeting.status === 'failed'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {meeting.status}
            </span>
            {isHost && (
              <button
                onClick={handleDeleteClick}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all border border-transparent hover:border-rose-950/20 relative z-10"
                title="Delete Meeting"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <Calendar size={9} />
            {new Date(meeting.createdAt).toLocaleDateString()}
          </div>
        </div>

        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
          {meeting.title}
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
          <User size={11} className="text-slate-500" />
          <span>Hosted by <strong className="text-slate-300 font-semibold">{meeting.host?.name || 'Unknown'}</strong></span>
        </p>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between mt-6 border-t border-slate-900/60 pt-4">
        {/* Left: Invite link copy */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800"
          title="Copy room invite link"
        >
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          <span>{copied ? 'Copied' : 'Invite'}</span>
        </button>

        {/* Right: Main status buttons */}
        {meeting.status === 'done' && (
          <button className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
            <Play size={10} className="fill-current" />
            <span>Play Summary</span>
          </button>
        )}

        {meeting.status === 'live' && (
          <button className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
            <ExternalLink size={10} />
            <span>Join Meeting</span>
          </button>
        )}

        {meeting.status === 'processing' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
            <RefreshCw size={10} className="animate-spin" />
            <span className="font-light">AI Analyzing...</span>
          </div>
        )}

        {meeting.status === 'failed' && (
          <div className="flex items-center gap-1 text-xs text-rose-500 font-medium" title="API process failed">
            <AlertCircle size={10} />
            <span>Failed</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCard;
