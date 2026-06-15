import React, { useState, useRef } from 'react';
import { X, UploadCloud, Video, FileText, CheckCircle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    // Check file type (mp4 or webm)
    const validTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.webm') && !selectedFile.name.endsWith('.mp4')) {
      setError('Please upload a valid video file (MP4, WebM).');
      setFile(null);
      return;
    }

    // Max file size 100MB in browser
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File is too large. Max limit is 100MB.');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
    
    // Autofill title if empty
    if (!title) {
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
      setTitle(nameWithoutExt);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file.');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || 'Uploaded Meeting');

    try {
      // Create XMLHTTPRequest to track upload progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/upload/video`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          onUploadSuccess(response.meetingId);
          onClose();
          // Reset fields
          setFile(null);
          setTitle('');
        } else {
          try {
            const errResponse = JSON.parse(xhr.responseText);
            setError(errResponse.message || 'Upload failed.');
          } catch {
            setError('Upload failed. Server error.');
          }
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setError('Network error during upload.');
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Connection error.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-card border-slate-800/80 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850 bg-slate-900/20">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UploadCloud size={18} className="text-indigo-400" />
            <span>Upload Pre-Recorded Meeting</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg bg-slate-900/60 border border-slate-850 hover:border-slate-800 transition-all"
            disabled={uploading}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl font-light text-center">
              {error}
            </div>
          )}

          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Meeting Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Marketing Alignments, Project Kickoff"
              className="glass-input py-2.5 text-xs"
              required
              disabled={uploading}
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!uploading ? handleUploadClick : undefined}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/5'
                : file
                ? 'border-indigo-500/40 bg-slate-900/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/webm"
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <Video size={24} />
                </div>
                <div className="text-xs font-bold text-slate-200 line-clamp-1 max-w-[280px] mx-auto">
                  {file.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  className="text-[10px] text-rose-400 underline mt-2 hover:text-rose-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <UploadCloud size={24} />
                </div>
                <div className="text-xs font-semibold text-slate-350">
                  Drag and drop your video file here, or <span className="text-indigo-400 font-bold hover:underline">browse</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Supports MP4, WebM (Max 100MB)
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin text-indigo-400" />
                  Streaming directly to storage...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="glow-btn-secondary px-5 py-2.5 text-xs"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glow-btn px-6 py-2.5 text-xs flex items-center gap-1.5"
              disabled={uploading || !file}
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
