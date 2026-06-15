const Meeting = require('../models/Meeting');
const Annotation = require('../models/Annotation');
const { v4: uuidv4 } = require('uuid');

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

module.exports = {
  createMeeting,
  getMeetingDetails,
  addAnnotation,
  getMeetingsList
};
