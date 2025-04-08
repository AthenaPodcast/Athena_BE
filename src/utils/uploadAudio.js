const cloudinary = require('../config/cloudinary');

const uploadAudio = async (filePath) => {
  return cloudinary.uploader.upload(filePath, {
    resource_type: 'video', // for audio too
    folder: 'podcasts/audio',
  });
};

module.exports = uploadAudio;
