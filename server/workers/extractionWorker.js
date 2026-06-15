require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const Meeting = require('../models/Meeting');
const { redisUrl, connectionOptions } = require('../services/redisService');
const { extractMeetingInsights } = require('../services/groqService');

// Create a publisher connection to send live update alerts
const publisher = new Redis(redisUrl, connectionOptions);

const processExtraction = async (job) => {
  const { meetingId, transcript } = job.data;
  console.log(`[Extraction Worker] Processing job ${job.id} for Meeting ${meetingId}`);

  let meeting = null;

  try {
    meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting with ID ${meetingId} not found.`);
    }

    if (!transcript || transcript.length === 0) {
      console.warn('Transcript is empty. Saving empty insights.');
      meeting.summary = 'No transcript available to summarize.';
      meeting.actionItems = [];
      meeting.decisions = [];
      meeting.status = 'done';
      await meeting.save();
      
      // Notify socket server
      await publisher.publish('meeting:updates', JSON.stringify({
        roomId: meeting.roomId,
        meetingId: meeting._id,
        status: 'done'
      }));
      return;
    }

    console.log('Sending transcript to Groq LLaMA 3 for insight extraction...');
    const insights = await extractMeetingInsights(transcript);
    console.log('Insights extracted successfully:', insights);

    // Save insights to Meeting document
    meeting.summary = insights.summary;
    meeting.actionItems = insights.actionItems;
    meeting.decisions = insights.decisions;
    meeting.status = 'done';
    
    await meeting.save();
    console.log(`Meeting ${meetingId} status updated to 'done'.`);

    // Publish update event to Redis Pub/Sub channel
    await publisher.publish('meeting:updates', JSON.stringify({
      roomId: meeting.roomId,
      meetingId: meeting._id,
      status: 'done'
    }));

    console.log(`[Extraction Worker] Job ${job.id} finished successfully.`);

  } catch (error) {
    console.error(`[Extraction Worker] Job ${job.id} failed:`, error.message);
    if (meeting) {
      meeting.status = 'failed';
      await meeting.save();
      
      // Publish failure alert
      await publisher.publish('meeting:updates', JSON.stringify({
        roomId: meeting.roomId,
        meetingId: meeting._id,
        status: 'failed'
      }));
    }
    throw error;
  }
};

// Start the worker
const connection = new Redis(redisUrl, connectionOptions);
const worker = new Worker('extraction', processExtraction, { connection });

console.log('Extraction Worker started and listening for jobs...');

module.exports = worker;
