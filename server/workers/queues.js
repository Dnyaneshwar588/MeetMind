const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { redisUrl, connectionOptions } = require('../services/redisService');

// Dedicated Redis clients for queues
let transcriptionQueue = null;
let extractionQueue = null;

try {
  const connection = new Redis(redisUrl, connectionOptions);
  
  transcriptionQueue = new Queue('transcription', { connection });
  extractionQueue = new Queue('extraction', { connection });
  
  console.log('BullMQ Queues initialized successfully.');
} catch (err) {
  console.error('Failed to initialize BullMQ Queues. Workers may not receive jobs.', err.message);
}

const addTranscriptionJob = async (data) => {
  if (!transcriptionQueue) {
    console.warn('Transcription queue is not initialized. Skipping job.');
    return null;
  }
  return await transcriptionQueue.add('transcribe', data, {
    removeOnComplete: true,
    removeOnFail: false
  });
};

const addExtractionJob = async (data) => {
  if (!extractionQueue) {
    console.warn('Extraction queue is not initialized. Skipping job.');
    return null;
  }
  return await extractionQueue.add('extract', data, {
    removeOnComplete: true,
    removeOnFail: false
  });
};

module.exports = {
  transcriptionQueue,
  extractionQueue,
  addTranscriptionJob,
  addExtractionJob
};
