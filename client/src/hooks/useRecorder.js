import { useRef, useState, useCallback, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const useRecorder = (stream, roomId, token) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const chunksBufferRef = useRef([]);
  const intervalIdRef = useRef(null);
  
  const tokenRef = useRef(token);
  const streamRef = useRef(stream);
  const roomIdRef = useRef(roomId);

  // Keep references fresh
  useEffect(() => {
    tokenRef.current = token;
    streamRef.current = stream;
    roomIdRef.current = roomId;
  }, [token, stream, roomId]);

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const uploadChunk = async (blob, chunkIndex) => {
    if (!roomIdRef.current) return;
    
    const formData = new FormData();
    formData.append('chunk', blob, `chunk_${chunkIndex}.webm`);
    formData.append('roomId', roomIdRef.current);
    formData.append('chunkIndex', chunkIndex);

    try {
      console.log(`Uploading chunk ${chunkIndex} for room ${roomIdRef.current}...`);
      const response = await fetch(`${API_URL}/api/upload/chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      console.log(`Chunk ${chunkIndex} uploaded successfully.`);
    } catch (error) {
      console.error(`Error uploading chunk ${chunkIndex}:`, error);
    }
  };

  const uploadRemainingBuffer = async () => {
    if (chunksBufferRef.current.length > 0) {
      const mimeType = getSupportedMimeType();
      const finalBlob = new Blob(chunksBufferRef.current, { type: mimeType });
      chunksBufferRef.current = [];
      const currentIdx = chunkIndexRef.current;
      chunkIndexRef.current += 1;
      await uploadChunk(finalBlob, currentIdx);
    }
  };

  const startRecording = useCallback(() => {
    const activeStream = streamRef.current;
    if (!activeStream) {
      console.warn('Cannot start recording: stream is not available.');
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      console.error('No supported mimeTypes found for MediaRecorder on this browser.');
      return;
    }

    console.log(`Starting recording with mimeType: ${mimeType}`);
    chunksBufferRef.current = [];
    chunkIndexRef.current = 0;

    try {
      const recorder = new MediaRecorder(activeStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksBufferRef.current.push(event.data);
        }
      };

      // Slice recording data every 1 second to accumulate in buffer
      recorder.start(1000);
      setIsRecording(true);

      // Every 60 seconds, packages buffer as a chunk, upload it, and clear buffer
      intervalIdRef.current = setInterval(async () => {
        if (chunksBufferRef.current.length > 0) {
          const mimeTypeToUse = getSupportedMimeType();
          const chunkBlob = new Blob(chunksBufferRef.current, { type: mimeTypeToUse });
          chunksBufferRef.current = [];
          
          const currentIdx = chunkIndexRef.current;
          chunkIndexRef.current += 1;
          
          await uploadChunk(chunkBlob, currentIdx);
        }
      }, 60000);

    } catch (error) {
      console.error('Failed to start MediaRecorder:', error);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    console.log('Stopping recording...');
    
    // Clear 60s upload timer
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Stop recorder
    recorder.stop();
    setIsRecording(false);

    // Let recorder save last bits
    await new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    // Upload remaining data in buffer
    await uploadRemainingBuffer();

    // Finalize recording on server
    const totalChunks = chunkIndexRef.current;
    console.log(`Finalizing recording with a total of ${totalChunks} chunks.`);
    
    try {
      const response = await fetch(`${API_URL}/api/upload/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}`
        },
        body: JSON.stringify({
          roomId: roomIdRef.current,
          totalChunks
        })
      });

      if (!response.ok) {
        throw new Error(`Finalization request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Finalization completed. Final URL:', data.recordingUrl);
      return data;
    } catch (error) {
      console.error('Error finalising meeting recording:', error);
    }
  }, []);

  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording
  };
};
