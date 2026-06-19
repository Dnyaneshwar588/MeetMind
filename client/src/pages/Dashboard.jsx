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

  const handleDeleteMeeting = async (meetingId) => {
    try {
      const res = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete meeting.');
      }

      // Update state to remove deleted meeting
      setMeetings((prev) => prev.filter((m) => m._id !== meetingId));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete meeting.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" style={{ width: '42px', height: '42px', flexShrink: 0 }} className="object-contain" alt="MeetMind Logo" />
            <span className="font-extrabold text-lg text-white tracking-wider">MeetMind</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-200">{user.name}</span>
              <span className="block text-[10px] text-slate-500">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-400 p-2.5 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-rose-950/30 transition-all hover:bg-slate-900"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Dashboard Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Meetings</h2>
            <p className="text-slate-400 text-xs mt-1">Join a live WebRTC room or upload pre-recorded meetings to trigger AI minutes</p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl py-2.5 px-4 text-xs flex items-center justify-center gap-1.5 flex-1 sm:flex-initial transition-all active:scale-[0.98]"
            >
              <Upload size={13} />
              <span>Upload Video</span>
            </button>
            <button
              onClick={handleCreateMeeting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 px-5 text-xs flex items-center justify-center gap-1.5 flex-1 sm:flex-initial transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>Create Live Room</span>
            </button>
          </div>
        </div>

        {/* Meeting Grid Section */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl mb-6 font-medium text-center">
            {error}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-start">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 flex-1">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-xs">Retrieving meeting history...</span>
            </div>
          ) : meetings.length === 0 ? (
            <div className="bg-[#0f172a]/20 border border-dashed border-slate-850 p-16 rounded-2xl text-center flex flex-col items-center justify-center flex-1 my-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                <ListCollapse size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-350">No Meetings Found</h3>
              <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto font-light leading-relaxed">
                Get started by creating a new live WebRTC room or uploading an MP4/WebM recording for summary extraction.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting._id} meeting={meeting} onDelete={handleDeleteMeeting} />
              ))}
            </div>
          )}
        </div>
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
