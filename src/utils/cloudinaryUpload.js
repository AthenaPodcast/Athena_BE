const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

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