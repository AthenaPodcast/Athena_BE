const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

exports.uploadAudioToCloudinary = async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No audio file provided' });

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // audio is under "video" type in Cloudinary
            folder: 'episods', // optional folder name
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(file.buffer);

    res.status(200).json({
      message: 'Audio uploaded successfully',
      audioUrl: result.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading audio' });
  }
};
