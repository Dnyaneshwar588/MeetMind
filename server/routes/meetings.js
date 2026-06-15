const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createMeeting, getMeetingDetails, addAnnotation, getMeetingsList, deleteMeeting } = require('../controllers/meetingController');

router.post('/create', verifyToken, createMeeting);
router.get('/', verifyToken, getMeetingsList);
router.get('/:meetingId', verifyToken, getMeetingDetails);
router.delete('/:meetingId', verifyToken, deleteMeeting);
router.post('/:meetingId/annotations', verifyToken, addAnnotation);

module.exports = router;
