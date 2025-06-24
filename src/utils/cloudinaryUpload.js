const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const ytdlpPath = path.join('C:', 'Users', 'hp', 'Downloads', 'yt-dlp.exe');
const { spawn } = require('child_process');

exports.streamUpload = (fileBuffer, folder = 'default') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder,
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

exports.uploadAudioFromYoutube = async (youtubeUrl, folder = 'youtube_audio') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder,
      },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );

    const downloader = spawn(ytdlpPath, [
      '-f', 'bestaudio',
      '-o', '-', 
      youtubeUrl
    ]);

    downloader.stdout.pipe(stream);
    downloader.stderr.on('data', data => console.error('yt-dlp stderr:', data.toString()));
    downloader.on('error', reject);
  });
};
