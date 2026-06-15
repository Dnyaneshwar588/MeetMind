require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');
const Meeting = require('../models/Meeting');
const { redisUrl, connectionOptions } = require('../services/redisService');
const { transcribeAudio } = require('../services/groqService');
const { addExtractionJob } = require('./queues');

const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper: Download a remote file to a local path
const downloadFile = (url, destPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: server returned status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
};

// Helper: Extract audio from video using ffmpeg
const extractAudio = (videoPath, audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .toFormat('mp3')
      .save(audioPath)
      .on('end', () => {
        console.log(`Audio extraction successful: ${audioPath}`);
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('Audio extraction failed:', err);
        reject(err);
      });
  });
};

const processTranscription = async (job) => {
  const { meetingId, s3Url } = job.data;
  console.log(`[Transcription Worker] Processing job ${job.id} for Meeting ${meetingId}`);

  let meeting = null;
  let localVideoPath = '';
  let localAudioPath = '';

  try {
    meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting with ID ${meetingId} not found.`);
    }

    meeting.status = 'processing';
    await meeting.save();

    // 1. Resolve the path of the file
    // Check if the URL is local (starts with /uploads/) or remote
    const uniqueJobId = `${meetingId}-${job.id}`;
    localVideoPath = path.join(TEMP_DIR, `${uniqueJobId}-video.mp4`);
    localAudioPath = path.join(TEMP_DIR, `${uniqueJobId}-audio.mp3`);

    if (s3Url.startsWith('/uploads/')) {
      // It is local storage. Resolve its path relative to public/uploads
      const publicUploadsDir = path.join(__dirname, '../public');
      const resolvedPath = path.join(publicUploadsDir, s3Url);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Local meeting file not found at ${resolvedPath}`);
      }
      // Copy to temp space to safely process
      await fs.promises.copyFile(resolvedPath, localVideoPath);
    } else {
      // It is remote S3 storage. Download it.
      console.log(`Downloading remote recording from: ${s3Url}`);
      await downloadFile(s3Url, localVideoPath);
    }

    // 2. Extract audio track (makes it small enough for Groq's 25MB limit)
    console.log('Extracting audio track from video...');
    await extractAudio(localVideoPath, localAudioPath);

    // 3. Transcribe audio using Groq Whisper API
    console.log('Sending audio to Groq Whisper for transcription...');
    const segments = await transcribeAudio(localAudioPath);
    console.log(`Transcription completed. Got ${segments.length} segments.`);

    // 4. Save segments to Meeting document
    meeting.transcript = segments;
    await meeting.save();

    // 5. Clean up local files
    cleanupFile(localVideoPath);
    cleanupFile(localAudioPath);

    // 6. Schedule extraction job
    await addExtractionJob({ meetingId, transcript: segments });
    console.log(`[Transcription Worker] Job ${job.id} done. Added insights extraction job.`);

  } catch (error) {
    console.error(`[Transcription Worker] Job ${job.id} failed:`, error.message);
    if (meeting) {
      meeting.status = 'failed';
      await meeting.save();
    }
    // Clean up files in case of failure
    cleanupFile(localVideoPath);
    cleanupFile(localAudioPath);
    throw error;
  }
};

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(`Failed to delete temp file ${filePath}:`, e.message);
    }
  }
};

// Start the worker
const connection = new Redis(redisUrl, connectionOptions);
const worker = new Worker('transcription', processTranscription, { connection });

console.log('Transcription Worker started and listening for jobs...');

module.exports = worker;
