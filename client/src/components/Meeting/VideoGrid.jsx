import React, { useEffect, useRef } from 'react';

const VideoCard = ({ stream, isLocal, userName }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Safely check if video tracks are enabled to display placeholder when video is off
  const isVideoEnabled = stream && stream.getVideoTracks().some(track => track.enabled);

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-slate-700/80">
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover transform scale-x-[-1]" // mirror local/front camera video
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/80 text-slate-400">
          <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-400 mb-2">
            {userName ? userName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="text-xs text-slate-500">{isVideoEnabled ? 'Connecting media...' : 'Camera Off'}</span>
        </div>
      )}
      
      {/* Overlay label */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-800 text-slate-200 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${stream ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
        {userName} {isLocal ? '(You)' : ''}
      </div>
    </div>
  );
};

export const VideoGrid = ({ localStream, peers, localName }) => {
  const totalParticipants = 1 + peers.length;
  
  // Decide grid class based on count
  let gridClass = 'grid-cols-1';
  if (totalParticipants === 2) {
    gridClass = 'grid-cols-1 md:grid-cols-2';
  } else if (totalParticipants > 2) {
    gridClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  }

  return (
    <div className={`grid ${gridClass} gap-6 w-full overflow-y-auto p-1 max-h-[calc(100vh-280px)]`}>
      <VideoCard stream={localStream} isLocal={true} userName={localName} />
      {peers.map((peer) => (
        <VideoCard
          key={peer.socketId}
          stream={peer.stream}
          isLocal={false}
          userName={peer.userName}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
