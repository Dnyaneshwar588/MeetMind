import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Video, Cpu, Shield, Sparkles, LogIn, ArrowRight } from 'lucide-react';

export const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-brand-darker">
      
      {/* Decorative backdrop blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-accent/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-brand-cyan/10 blur-3xl" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <Bot size={20} />
          </div>
          <span className="font-extrabold text-lg text-white tracking-wider">MeetMind</span>
        </div>
        <div>
          {token ? (
            <button onClick={() => navigate('/dashboard')} className="glow-btn px-5 py-2 text-xs flex items-center gap-1">
              <span>Go to Dashboard</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="glow-btn-secondary px-5 py-2 text-xs flex items-center gap-1.5">
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-20 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1 rounded-full text-xs text-indigo-300 font-semibold mb-8 animate-pulse">
          <Sparkles size={12} />
          <span>Powered by Groq & LLaMA 3</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
          AI-Powered Video Meetings <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            With Live Co-Pilot Chat
          </span>
        </h1>
        
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mt-6 font-light leading-relaxed">
          MeetMind bridges real-time WebRTC conferencing with immediate AI summaries, 
          action item extraction, and a live meeting chatbot to query decisions and notes on the fly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="glow-btn px-8 py-3.5 text-sm flex items-center gap-2"
          >
            <span>Host Free Meeting</span>
            <ArrowRight size={16} />
          </button>
          {!token && (
            <button
              onClick={() => navigate('/login')}
              className="glow-btn-secondary px-8 py-3.5 text-sm"
            >
              Learn More
            </button>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          <div className="glass-card p-8 text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
              <Video size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">WebRTC Video Calls</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Connect immediately with peers via secure, lag-free peer-to-peer audio and video streaming.
            </p>
          </div>

          <div className="glass-card p-8 text-left">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
              <Bot size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live Meeting Chatbot</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Ask questions to our smart AI assistant referencing live transcribed speech context on-demand.
            </p>
          </div>

          <div className="glass-card p-8 text-left">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <Cpu size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Minutes</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Whisper compiles clean transcript segments, and LLaMA extracts summaries, action tasks, and decisions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 py-8 text-center relative z-10">
        <p className="text-[10px] text-slate-500 font-light">
          &copy; {new Date().getFullYear()} MeetMind. All rights reserved. Powered by Groq AI and WebRTC.
        </p>
      </footer>
    </div>
  );
};

export default Home;
