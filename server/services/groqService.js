const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });

/**
 * Transcribes an audio file using Groq Whisper.
 * @param {string} filePath - Absolute path to the local audio file.
 * @returns {Promise<Array<{text: string, start: number, end: number}>>}
 */
const transcribeAudio = async (filePath) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in environment variables.');
    }

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    if (transcription && transcription.segments) {
      return transcription.segments.map(s => ({
        text: s.text,
        start: s.start,
        end: s.end
      }));
    }

    // Fallback if segments is not returned but text is
    if (transcription && transcription.text) {
      return [{ text: transcription.text, start: 0, end: 10 }];
    }

    return [];
  } catch (error) {
    console.error('Groq Whisper Transcription error:', error);
    throw error;
  }
};

/**
 * Extracts meeting summary, action items, and key decisions from transcript using LLaMA 3.
 * @param {Array<{text: string, start: number, end: number}>|string} transcript
 * @returns {Promise<{summary: string, actionItems: Array<string>, decisions: Array<string>}>}
 */
const extractMeetingInsights = async (transcript) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in environment variables.');
    }

    let transcriptText = '';
    if (Array.isArray(transcript)) {
      transcriptText = transcript.map(s => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s]: ${s.text}`).join('\n');
    } else {
      transcriptText = transcript;
    }

    const systemPrompt = `You are a meeting analyst. Given the transcript below, extract:
1. A concise summary (3-5 sentences)
2. Action items as a JSON array of strings
3. Key decisions as a JSON array of strings

Respond ONLY in this exact JSON format with no extra text:
{ "summary": "...", "actionItems": ["...", "..."], "decisions": ["...", "..."] }`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcriptText }
      ],
      temperature: 0.3,
      max_tokens: 1536,
      stream: false
    });

    const responseContent = response.choices[0]?.message?.content || '';
    
    // Clean up potential markdown formatting block
    let cleanJson = responseContent.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return {
        summary: parsed.summary || 'No summary extracted.',
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || []
      };
    } catch (parseError) {
      console.warn('Failed to parse Groq response directly. Response was:', responseContent);
      // Attempt manual extraction or return a structured fallback
      return {
        summary: responseContent,
        actionItems: [],
        decisions: []
      };
    }
  } catch (error) {
    console.error('Groq LLaMA Insights extraction error:', error);
    throw error;
  }
};

/**
 * Streams a chat completion response from LLaMA 3.
 * @param {Array<{role: string, content: string}>} messages
 * @param {Function} onToken - Callback function called for each token.
 * @param {Function} onDone - Callback function called when stream completes.
 */
const streamChatResponse = async (messages, onToken, onDone) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      onToken('Error: GROQ_API_KEY is not defined in environment variables.');
      onDone();
      return;
    }

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      stream: true,
      temperature: 0.5,
      max_tokens: 1024
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      onToken(token);
    }
    onDone();
  } catch (error) {
    console.error('Groq LLaMA Chat streaming error:', error);
    onToken(`\n[AI error: ${error.message}]`);
    onDone();
  }
};

module.exports = {
  transcribeAudio,
  extractMeetingInsights,
  streamChatResponse
};
