const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// ioredis requires maxRetriesPerRequest to be null for BullMQ compatibility
const connectionOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true
};

let redis = null;

try {
  redis = new Redis(redisUrl, connectionOptions);
  redis.connect().catch((err) => {
    console.warn('Redis initial connection failed, features relying on Redis/BullMQ might be offline.', err.message);
  });
  
  redis.on('error', (err) => {
    console.warn('Redis runtime error:', err.message);
  });
} catch (error) {
  console.error('Failed to initialize ioredis client:', error);
}

module.exports = {
  redis,
  redisUrl,
  connectionOptions
};
