import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Video, Cpu, Shield, Sparkles, LogIn, ArrowRight } from 'lucide-react';

export const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-[#090d16]">
      
      {/* Decorative backdrop blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-slate-900/80 bg-[#090d16]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" style={{ width: '40px', height: '40px', flexShrink: 0 }} className="object-contain transition-transform hover:scale-105" alt="MeetMind Logo" />
            <span className="font-extrabold text-lg text-white tracking-tight">MeetMind</span>
          </div>
          <div>
            {token ? (
              <button onClick={() => navigate('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl px-5 py-2.5 flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all hover:-translate-y-[1px]">
                <span>Go to Dashboard</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs rounded-xl px-5 py-2.5 flex items-center gap-1.5 transition-all hover:-translate-y-[1px]">
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-24 flex flex-col items-center justify-center text-center relative z-10 flex-1">
        
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold tracking-wider uppercase mb-6">
          <Sparkles size={10} />
          <span>Next-Generation Meetings</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          AI-Powered Video Meetings <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
            With Real-Time AI Copilot
          </span>
        </h1>
        
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mt-6 font-light leading-relaxed">
          MeetMind bridges real-time WebRTC conferencing with immediate AI summaries, 
          action item extraction, and a live meeting chatbot to query decisions and notes on the fly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl px-8 py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all hover:-translate-y-[1px] active:scale-[0.98]"
          >
            <span>Host Free Meeting</span>
            <ArrowRight size={15} />
          </button>
          {!token && (
            <button
              onClick={() => navigate('/login')}
              className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm rounded-xl px-8 py-3.5 transition-all hover:-translate-y-[1px] active:scale-[0.98]"
            >
              Learn More
            </button>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          <div className="bg-[#0f172a]/30 border border-slate-850 p-8 rounded-2xl hover:border-slate-800 hover:bg-[#0f172a]/40 transition-all duration-300 text-left group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-105 transition-transform">
              <Video size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">WebRTC Video Calls</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Connect immediately with peers via secure, lag-free peer-to-peer audio and video streaming.
            </p>
          </div>

          <div className="bg-[#0f172a]/30 border border-slate-850 p-8 rounded-2xl hover:border-slate-800 hover:bg-[#0f172a]/40 transition-all duration-300 text-left group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
              <Bot size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Live Meeting Chatbot</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Ask questions to our smart AI assistant referencing live transcribed speech context on-demand.
            </p>
          </div>

          <div className="bg-[#0f172a]/30 border border-slate-850 p-8 rounded-2xl hover:border-slate-800 hover:bg-[#0f172a]/40 transition-all duration-300 text-left group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-105 transition-transform">
              <Cpu size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Automated Minutes</h3>
            <p className="text-slate-400 text-xs font-light leading-relaxed">
              Whisper compiles clean transcript segments, and LLaMA extracts summaries, action tasks, and decisions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center relative z-10 bg-[#090d16]/80">
        <p className="text-[10px] text-slate-500 font-light">
          &copy; {new Date().getFullYear()} MeetMind. All rights reserved. Powered by Groq AI and WebRTC.
        </p>
      </footer>
    </div>
  );
};

export default Home;
