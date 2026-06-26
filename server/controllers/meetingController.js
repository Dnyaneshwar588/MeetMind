const Meeting = require('../models/Meeting');
const Annotation = require('../models/Annotation');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Controller: POST /api/meetings/create
const createMeeting = async (req, res) => {
  try {
    const { title } = req.body;
    const roomId = uuidv4();

    const meeting = new Meeting({
      roomId,
      title: title || 'Untitled Meeting Session',
      host: req.user.id,
      participants: [req.user.id],
      status: 'live'
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      roomId,
      joinLink: `/meeting/${roomId}`
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ message: 'Server error during meeting creation.' });
  }
};

// Controller: GET /api/meetings/:meetingId
const getMeetingDetails = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name email')
      .populate('participants', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting session not found.' });
    }

    // Retrieve annotations for this meeting
    const annotations = await Annotation.find({ meetingId })
      .populate('userId', 'name')
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      meeting,
      annotations
    });
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    res.status(500).json({ message: 'Server error retrieving meeting details.' });
  }
};

// Controller: POST /api/meetings/:meetingId/annotations
const addAnnotation = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { timestamp, text } = req.body;

    if (timestamp === undefined || !text) {
      return res.status(400).json({ message: 'Missing timestamp or text annotation.' });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting session not found.' });
    }

    const annotation = new Annotation({
      meetingId,
      userId: req.user.id,
      timestamp: parseFloat(timestamp),
      text
    });

    await annotation.save();

    // Populate user's name before returning
    const populatedAnnotation = await Annotation.findById(annotation._id)
      .populate('userId', 'name');

    res.status(201).json({
      success: true,
      annotation: populatedAnnotation
    });
  } catch (error) {
    console.error('Error adding annotation:', error);
    res.status(500).json({ message: 'Server error saving annotation.' });
  }
};

// Controller: GET /api/meetings (List past meetings for dashboard)
const getMeetingsList = async (req, res) => {
  try {
    // Return all meetings where the user is either the host or participant
    const meetings = await Meeting.find({
      $or: [
        { host: req.user.id },
        { participants: req.user.id }
      ]
    })
      .populate('host', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Error fetching meetings list:', error);
    res.status(500).json({ message: 'Server error retrieving meetings list.' });
  }
};

const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting session not found.' });
    }

    // Only host can delete the meeting
    if (meeting.host.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only the meeting host can delete this session.' });
    }

    // Delete annotations
    await Annotation.deleteMany({ meetingId });

    // Clean up local recording files if they exist
    if (meeting.recordingUrl && meeting.recordingUrl.startsWith('/uploads/')) {
      try {
        const relativePath = meeting.recordingUrl.replace(/^\/uploads/, '');
        const fullPath = path.join(__dirname, '../public/uploads', relativePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted meeting video file: ${fullPath}`);
        }
        
        // Also if it was a recorded room, we have a recordings/roomId directory
        if (meeting.roomId) {
          const roomRecordingsDir = path.join(__dirname, '../public/uploads/recordings', meeting.roomId);
          if (fs.existsSync(roomRecordingsDir)) {
            fs.rmSync(roomRecordingsDir, { recursive: true, force: true });
            console.log(`Deleted meeting recordings directory: ${roomRecordingsDir}`);
          }
        }
      } catch (err) {
        console.error('Failed to delete physical video files:', err.message);
      }
    }

    // Delete the meeting document
    await Meeting.findByIdAndDelete(meetingId);

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ message: 'Server error deleting meeting.' });
  }
};

// Controller: PUT /api/meetings/:roomId/end
const endMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting session not found.' });
    }

    // Only the host can end the meeting
    if (meeting.host.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only the meeting host can end this session.' });
    }

    if (meeting.status !== 'live') {
      // Already ended/processing — just return current state
      return res.status(200).json({ success: true, status: meeting.status });
    }

    meeting.status = 'done';
    await meeting.save();

    console.log(`Meeting ${roomId} ended by host ${req.user.id}`);

    res.status(200).json({ success: true, status: 'done' });
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ message: 'Server error ending meeting.' });
  }
};

const joinMeeting = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: 'Meeting ID (Room ID) is required.' });
    }

    const meeting = await Meeting.findOne({ roomId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting session not found.' });
    }

    // Add user as participant if not already added
    if (!meeting.participants.some(p => p.toString() === req.user.id)) {
      meeting.participants.push(req.user.id);
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      roomId: meeting.roomId,
      message: 'Successfully joined meeting.'
    });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ message: 'Server error during join.' });
  }
};

module.exports = {
  createMeeting,
  getMeetingDetails,
  addAnnotation,
  getMeetingsList,
  deleteMeeting,
  joinMeeting,
  endMeeting
};
