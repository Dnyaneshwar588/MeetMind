import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, LogOut, Bot, Grid, ListCollapse } from 'lucide-react';
import MeetingCard from '../components/Dashboard/MeetingCard';
import UploadModal from '../components/Dashboard/UploadModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const Dashboard = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMeetings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleSignOut();
          return;
        }
        throw new Error('Failed to retrieve meetings list.');
      }
      
      const data = await res.json();
      setMeetings(data.meetings);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error loading dashboard meetings.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchMeetings(true);

    // Set up polling to update status of processing videos
    const interval = setInterval(() => {
      fetchMeetings(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, navigate]);

  const handleCreateMeeting = async () => {
    try {
      const res = await fetch(`${API_URL}/api/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: `Meeting Session by ${user.name}` })
      });

      if (!res.ok) {
        throw new Error('Failed to create live room.');
      }

      const data = await res.json();
      navigate(data.joinLink);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error launching new room.');
    }
  };

  const handleUploadSuccess = (meetingId) => {
    fetchMeetings(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-10 flex flex-col justify-between">
      {/* Top Navigation */}
      <div>
        <header className="flex items-center justify-between border-b border-slate-850 pb-6 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
              <Bot size={20} />
            </div>
            <span className="font-extrabold text-lg text-white tracking-wider">MeetMind</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-200">{user.name}</span>
              <span className="block text-[10px] text-slate-500">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-400 p-2.5 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-rose-950/30 transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dashboard Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Your Meetings</h2>
            <p className="text-slate-400 text-xs mt-1">Join a live WebRTC room or upload pre-recorded meetings to trigger AI minutes</p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="glow-btn-secondary flex-1 sm:flex-initial py-2.5 px-4 text-xs flex items-center justify-center gap-1.5"
            >
              <Upload size={14} />
              <span>Upload Video</span>
            </button>
            <button
              onClick={handleCreateMeeting}
              className="glow-btn flex-1 sm:flex-initial py-2.5 px-5 text-xs flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              <span>Create Live Room</span>
            </button>
          </div>
        </div>

        {/* Meeting Grid Section */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-xl mb-6 font-light text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span>Retrieving meeting history...</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="glass-card p-16 text-center border-dashed flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
              <ListCollapse size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-350">No Meetings Found</h3>
            <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto">
              Get started by creating a new live WebRTC room or uploading an MP4/WebM recording for summary extraction.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting._id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal popup */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default Dashboard;
