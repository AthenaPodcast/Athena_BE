const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_SIZE = 25 * 1024 * 1024;
const SEGMENT_DURATION = 300;

async function downloadAudio(url, filename) {
  const rawPath = path.join(__dirname, `raw_${uuidv4()}.webm`);
  const response = await axios({ url, responseType: 'stream' });
  const rawStream = fs.createWriteStream(rawPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(rawStream);
    rawStream.on('finish', async () => {
      const outputPath = path.join(__dirname, filename);

      // Convert to valid mp3 format for Whisper
      ffmpeg(rawPath)
        .toFormat('mp3')
        .on('end', () => {
          fs.unlinkSync(rawPath); // Clean up raw file
          resolve(outputPath);
        })
        .on('error', reject)
        .save(outputPath);
    });
    rawStream.on('error', reject);
  });
}


// compress audio
async function compressAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate('64k')
      .audioChannels(1)
      .toFormat('mp3')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

// split audio into 5-min chunks
async function splitAudio(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([`-f segment`, `-segment_time ${SEGMENT_DURATION}`, `-c copy`])
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter(f => f.startsWith('chunk_'))
          .map(f => path.join(outputDir, f));
        resolve(files);
      })
      .on('error', reject)
      .save(`${outputDir}/chunk_%03d.mp3`);
  });
}

// transcribe a single file buffer
async function transcribeBuffer(filepath) {
  const file = fs.createReadStream(filepath);
  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word']
  });
  
  console.log('Whisper response:', JSON.stringify(response, null, 2));

  return response;
}

// main function
async function transcribeAudioFromUrl(url) {
  const id = uuidv4();
  const originalPath = path.join(__dirname, `temp_original_${id}.mp3`);
  const compressedPath = path.join(__dirname, `temp_compressed_${id}.mp3`);
  const chunkDir = path.join(__dirname, `chunks_${id}`);
  fs.mkdirSync(chunkDir);
  let lastUsedResult = null;

  try {
    await downloadAudio(url, `temp_original_${id}.mp3`);
    let sourcePath = originalPath;

    const fileSize = fs.statSync(originalPath).size;
    if (fileSize > MAX_SIZE) {
      console.log('File too big – compressing...');
      await compressAudio(originalPath, compressedPath);

      const compressedSize = fs.statSync(compressedPath).size;
      if (compressedSize > MAX_SIZE) {
        console.log('Compressed file still too large – splitting...');
        await splitAudio(compressedPath, chunkDir);
        sourcePath = null;
      } else {
        sourcePath = compressedPath;
      }
    }

    let offset = 0;
    let fullText = '';
    let mergedWords = [];

    const processWords = (wordsArray) => {
        if (Array.isArray(wordsArray)) {
          wordsArray.forEach(word => {
            if (typeof word.word === 'string' && word.start != null && word.end != null) {
              mergedWords.push({
                word: word.word,
                start: word.start + offset,
                end: word.end + offset,
              });
            }
          });
        }
    };

    if (sourcePath) {
      const result = await transcribeBuffer(sourcePath);
      lastUsedResult = result;
      fullText = result.text || '';
      processWords(result.words);
    } else {
      const chunkFiles = fs.readdirSync(chunkDir).filter(f => f.endsWith('.mp3'));
      for (const file of chunkFiles) {
        const filePath = path.join(chunkDir, file);
        const result = await transcribeBuffer(filePath);
        lastUsedResult = result;
        fullText += (result.text || '') + ' ';
        processWords(result.words);

        const lastSegment = result.segments[result.segments.length - 1];
        offset += lastSegment ? lastSegment.end : SEGMENT_DURATION;
      }
    }

    console.log(" FINAL WORD COUNT:", mergedWords.length);
    console.log(" First word object:", mergedWords[0]);
    console.log(" transcriptJson is array?", Array.isArray(mergedWords));

    return {
      script: fullText.trim(),
      transcript_json: mergedWords,
      language: lastUsedResult?.language || 'unknown'
    };

  } catch (err) {
    console.error(' Transcription error:', err);
    throw err;

  } finally {
    [originalPath, compressedPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
    if (fs.existsSync(chunkDir)) {
      fs.readdirSync(chunkDir).forEach(f => fs.unlinkSync(path.join(chunkDir, f)));
      fs.rmdirSync(chunkDir);
    }
  }
}

module.exports = { transcribeAudioFromUrl };