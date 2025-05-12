const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function downloadAudio(url, filename) {
  const response = await axios({ url, responseType: 'stream' });
  const filePath = path.join(__dirname, filename);
  const writer = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

async function transcribeAudioFromUrl(url) {
  const localFile = await downloadAudio(url, 'temp-audio.mp3');
  const file = fs.createReadStream(localFile);

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text'
  });

  fs.unlinkSync(localFile); // clean up
  return transcription;
}

module.exports = { transcribeAudioFromUrl };
