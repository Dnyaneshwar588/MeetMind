const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const isS3Enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);

let s3Client = null;
if (isS3Enabled) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Local storage directory
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../public/uploads');

// Ensure local upload directories exist
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

// Helper to save a stream to local path
const streamToFile = (stream, filePath) => {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
};

const uploadChunk = async (roomId, chunkIndex, buffer) => {
  const key = `recordings/${roomId}/chunk_${chunkIndex}.webm`;
  
  if (isS3Enabled) {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'video/webm'
    });
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  } else {
    const chunkDir = path.join(LOCAL_UPLOAD_DIR, `recordings/${roomId}`);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    const filePath = path.join(chunkDir, `chunk_${chunkIndex}.webm`);
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/recordings/${roomId}/chunk_${chunkIndex}.webm`;
  }
};

const downloadChunks = async (roomId, totalChunks, tempDir) => {
  const filePaths = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const key = `recordings/${roomId}/chunk_${i}.webm`;
    const tempChunkPath = path.join(tempDir, `chunk_${i}.webm`);
    
    if (isS3Enabled) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      });
      const response = await s3Client.send(command);
      await streamToFile(response.Body, tempChunkPath);
      filePaths.push(tempChunkPath);
    } else {
      const localFilePath = path.join(LOCAL_UPLOAD_DIR, `recordings/${roomId}/chunk_${i}.webm`);
      if (fs.existsSync(localFilePath)) {
        await fs.promises.copyFile(localFilePath, tempChunkPath);
        filePaths.push(tempChunkPath);
      } else {
        throw new Error(`Local chunk recordings/${roomId}/chunk_${i}.webm not found`);
      }
    }
  }
  
  return filePaths;
};

const uploadFinalVideo = async (roomId, localFilePath) => {
  const key = `recordings/${roomId}/final.mp4`;
  
  if (isS3Enabled) {
    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: 'video/mp4'
    });
    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  } else {
    const finalDir = path.join(LOCAL_UPLOAD_DIR, `recordings/${roomId}`);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    const destPath = path.join(finalDir, 'final.mp4');
    await fs.promises.copyFile(localFilePath, destPath);
    return `/uploads/recordings/${roomId}/final.mp4`;
  }
};

const getMulterStorage = () => {
  if (isS3Enabled) {
    const multerS3 = require('multer-s3');
    return multerS3({
      s3: s3Client,
      bucket: process.env.S3_BUCKET_NAME,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const uniqueId = require('uuid').v4();
        cb(null, `uploads/${uniqueId}-${file.originalname}`);
      }
    });
  } else {
    const multer = require('multer');
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(LOCAL_UPLOAD_DIR, 'uploads');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const uniqueId = require('uuid').v4();
        cb(null, `${uniqueId}-${file.originalname}`);
      }
    });
  }
};

const getPublicUrlForUpload = (file) => {
  if (isS3Enabled) {
    return file.location;
  } else {
    return `/uploads/uploads/${file.filename}`;
  }
};

module.exports = {
  isS3Enabled,
  uploadChunk,
  downloadChunks,
  uploadFinalVideo,
  getMulterStorage,
  getPublicUrlForUpload
};
