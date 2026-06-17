const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const { v4: uuidv4 } = require('uuid');
const Meeting = require('../models/Meeting');
const s3Service = require('../services/s3Service');
const { addTranscriptionJob } = require('../workers/queues');

// Temporary directory for downloading chunks and running ffmpeg
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Controller: POST /api/upload/chunk
const uploadChunk = async (req, res) => {
  try {
    const { roomId, chunkIndex } = req.body;
    const file = req.file;

    if (!roomId || chunkIndex === undefined || !file) {
      return res.status(400).json({ message: 'Missing roomId, chunkIndex, or file chunk.' });
    }

    const chunkUrl = await s3Service.uploadChunk(roomId, parseInt(chunkIndex), file.buffer);

    res.status(200).json({
      success: true,
      message: `Chunk ${chunkIndex} uploaded successfully.`,
      url: chunkUrl
    });
  } catch (error) {
    console.error('Error in uploadChunk controller:', error);
    res.status(500).json({ message: 'Failed to upload chunk.' });
  }
};

// Controller: POST /api/upload/finalize
const finalizeUpload = async (req, res) => {
  const { roomId, totalChunks } = req.body;

  if (!roomId || totalChunks === undefined || totalChunks <= 0) {
    return res.status(400).json({ message: 'Missing roomId or valid totalChunks.' });
  }

  // Create dedicated temp folder for this room's merge operation
  const roomTempDir = path.join(TEMP_DIR, roomId);
  if (!fs.existsSync(roomTempDir)) {
    fs.mkdirSync(roomTempDir, { recursive: true });
  }

  const manifestPath = path.join(roomTempDir, 'concat.txt');
  const outputFilePath = path.join(roomTempDir, 'final.mp4');

  try {
    console.log(`Finalizing meeting ${roomId}. Downloading ${totalChunks} chunks...`);
    // 1. Download all chunks to temp path
    const localChunkPaths = await s3Service.downloadChunks(roomId, totalChunks, roomTempDir);

    // 2. Create the ffmpeg concat manifest
    // Important: Escape single quotes in filenames for ffmpeg concat demuxer
    const manifestContent = localChunkPaths
      .map(filePath => `file '${filePath.replace(/'/g, "'\\''")}'`)
      .join('\n');

    await fs.promises.writeFile(manifestPath, manifestContent);

    // Find the meeting to set status to processing
    const meeting = await Meeting.findOne({ roomId });
    if (meeting) {
      meeting.status = 'processing';
      await meeting.save();
    }

    // 3. Run ffmpeg stitching
    // Transcoding to libx264/aac makes it immediately playable in standard web browsers
    console.log('Running ffmpeg stitcher...');
    ffmpeg()
      .input(manifestPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c:v libx264', '-c:a aac', '-preset superfast', '-pix_fmt yuv420p'])
      .save(outputFilePath)
      .on('start', (commandLine) => {
        console.log('FFmpeg process started with command:', commandLine);
      })
      .on('error', async (err) => {
        console.error('FFmpeg stitching failed:', err);
        if (meeting) {
          meeting.status = 'failed';
          await meeting.save();
        }
        cleanupTempDir(roomTempDir);
        res.status(500).json({ message: 'FFmpeg stitching failed.' });
      })
      .on('end', async () => {
        try {
          console.log('FFmpeg stitching completed successfully. Uploading final MP4...');
          // 4. Upload final video to S3/local
          const finalVideoUrl = await s3Service.uploadFinalVideo(roomId, outputFilePath);

          // 5. Update Meeting status and recordingUrl
          if (meeting) {
            meeting.recordingUrl = finalVideoUrl;
            meeting.status = 'processing'; // set to processing since transcription is next
            await meeting.save();

            // 6. Dispatch BullMQ job to 'transcription' queue
            await addTranscriptionJob({ meetingId: meeting._id, s3Url: finalVideoUrl });
            console.log(`Dispatched transcription job for meeting ${meeting._id}`);
          }

          cleanupTempDir(roomTempDir);

          res.status(200).json({
            success: true,
            message: 'Meeting finalization and processing started.',
            recordingUrl: finalVideoUrl
          });
        } catch (error) {
          console.error('Error updating meeting or dispatching job:', error);
          if (meeting) {
            meeting.status = 'failed';
            await meeting.save();
          }
          cleanupTempDir(roomTempDir);
          res.status(500).json({ message: 'Final video upload/dispatch failed.' });
        }
      });

  } catch (error) {
    console.error('Stitching initialization error:', error);
    cleanupTempDir(roomTempDir);
    res.status(500).json({ message: 'Stitching processing failed to start.' });
  }
};

// Controller: POST /api/upload/video (pre-recorded video file upload)
const uploadPreRecordedVideo = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    const videoUrl = s3Service.getPublicUrlForUpload(file);
    const roomId = uuidv4();

    // Create Meeting model
    const meeting = new Meeting({
      roomId,
      title: req.body.title || 'Uploaded Meeting Session',
      host: req.user.id,
      participants: [req.user.id],
      recordingUrl: videoUrl,
      status: 'processing'
    });

    await meeting.save();

    // Dispatch BullMQ job to 'transcription' queue
    await addTranscriptionJob({ meetingId: meeting._id, s3Url: videoUrl });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing started.',
      meetingId: meeting._id,
      roomId
    });
  } catch (error) {
    console.error('Error uploading pre-recorded video:', error);
    res.status(500).json({ message: 'Error processing video upload.' });
  }
};

// Helper: Clean up directories recursively
const cleanupTempDir = (dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Cleaned up temp directory: ${dirPath}`);
    }
  } catch (e) {
    console.error(`Failed to clean up temp directory ${dirPath}:`, e.message);
  }
};

module.exports = {
  uploadChunk,
  finalizeUpload,
  uploadPreRecordedVideo
};
