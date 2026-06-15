import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Square, Circle } from 'lucide-react';

export const Controls = ({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  isRecording,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onLeave
}) => {
  return (
    <div className="glass-panel py-4 px-6 rounded-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto border-slate-800/80">
      
      {/* Recording status indicator */}
      <div className="flex items-center gap-2">
        {onToggleRecording && (
          <button
            onClick={onToggleRecording}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 pulse-active'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {isRecording ? (
              <>
                <Square size={12} className="fill-current" />
                <span>Recording (End)</span>
              </>
            ) : (
              <>
                <Circle size={12} className="fill-current text-rose-500" />
                <span>Record Meeting</span>
              </>
            )
          }
          </button>
        )}
      </div>

      {/* Main control buttons */}
      <div className="flex items-center gap-4">
        {/* Toggle Audio */}
        <button
          onClick={onToggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
            audioEnabled
              ? 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700/80 text-slate-200'
              : 'bg-rose-600 border-rose-500 hover:bg-rose-500 text-white'
          }`}
          title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Toggle Video */}
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
            videoEnabled
              ? 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700/80 text-slate-200'
              : 'bg-rose-600 border-rose-500 hover:bg-rose-500 text-white'
          }`}
          title={videoEnabled ? 'Stop Camera' : 'Start Camera'}
        >
          {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Toggle Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
            isScreenSharing
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700/80 text-slate-200'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <Monitor size={20} />
        </button>
      </div>

      {/* Leave button */}
      <div>
        <button
          onClick={onLeave}
          className="bg-rose-600 hover:bg-rose-500 hover:shadow-rose-600/30 text-white w-12 h-12 rounded-full flex items-center justify-center border border-rose-500 transition-all shadow-lg active:scale-95"
          title="Leave Meeting"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default Controls;
