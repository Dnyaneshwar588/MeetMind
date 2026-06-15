const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true, index: true },
  title: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recordingUrl: { type: String },
  transcript: [{
    text: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  }],
  summary: { type: String },
  actionItems: [{ type: String }],
  decisions: [{ type: String }],
  status: { type: String, enum: ['live', 'processing', 'done', 'failed'], default: 'live' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
