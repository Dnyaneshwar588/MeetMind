import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Bot } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const redirectUrl = localStorage.getItem('redirectPath') || '/dashboard';
      localStorage.removeItem('redirectPath');
      navigate(redirectUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="w-full max-w-md glass-card p-8 border-slate-800/80 shadow-2xl relative z-10">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" style={{ width: '80px', height: '80px' }} className="object-contain mb-3 animate-pulse" alt="MeetMind Logo" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-xs mt-1">Register to start hosting AI-augmented meetings</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl mb-4 font-light text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full glass-input !pl-10 text-xs"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full glass-input !pl-10 text-xs"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input !pl-10 text-xs"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full glow-btn mt-6 py-3 text-xs">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
