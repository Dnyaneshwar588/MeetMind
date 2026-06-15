require('dotenv').config();
const mongoose = require('mongoose');
const { redis } = require('./services/redisService');
const { extractMeetingInsights } = require('./services/groqService');

async function runDiagnostics() {
  console.log('\n=================================================');
  console.log('       MEETMIND AI CONNECTIONS DIAGNOSTIC        ');
  console.log('=================================================\n');

  // 1. MongoDB check
  try {
    console.log('1. Testing MongoDB connection...');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meetmind';
    await mongoose.connect(dbUri);
    console.log('   [SUCCESS] Connected to MongoDB database.\n');
    await mongoose.disconnect();
  } catch (error) {
    console.error(`   [FAILURE] MongoDB connection failed: ${error.message}\n`);
  }

  // 2. Redis check
  if (redis) {
    try {
      console.log('2. Testing Redis connection...');
      // ping
      await redis.set('meetmind:test', 'redis_ok');
      const val = await redis.get('meetmind:test');
      await redis.del('meetmind:test');
      if (val === 'redis_ok') {
        console.log('   [SUCCESS] Connected to Redis. Get/Set successful.\n');
      } else {
        throw new Error('Retrieved value did not match.');
      }
    } catch (error) {
      console.error(`   [FAILURE] Redis operation failed: ${error.message}\n`);
    }
  } else {
    console.log('   [WARNING] Redis connection client is not initialized.\n');
  }

  // 3. Groq SDK check
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('3. Testing Groq SDK LLaMA 3 connectivity...');
      const testTranscript = 'Speaker A: Hi everyone. Let\'s outline our goal. Speaker B: Yes, we need to complete the WebRTC implementation. Speaker A: Perfect. I will coordinate the server socket integrations, and you will finalize the client-side useWebRTC hook.';
      const insights = await extractMeetingInsights(testTranscript);
      console.log('   [SUCCESS] Groq LLaMA 3 insights extracted:');
      console.log(`     - Summary: "${insights.summary}"`);
      console.log(`     - Action Items: ${JSON.stringify(insights.actionItems)}`);
      console.log(`     - Key Decisions: ${JSON.stringify(insights.decisions)}`);
      console.log();
    } catch (error) {
      console.error(`   [FAILURE] Groq API request failed: ${error.message}\n`);
    }
  } else {
    console.log('   [WARNING] GROQ_API_KEY is not defined in environment variables. AI features will skip.\n');
  }

  console.log('=================================================');
  console.log('            DIAGNOSTIC TEST COMPLETE             ');
  console.log('=================================================\n');
  process.exit(0);
}

runDiagnostics();
