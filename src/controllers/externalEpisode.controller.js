const youtubedl = require('youtube-dl-exec');
const ExternalEpisodeModel = require('../models/externalEpisode.model');
const { uploadAudioFromYoutube } = require('../utils/cloudinaryUpload');
const pool = require('../../db');
const { transcribeAudioFromUrl } = require('../utils/transcribe');

exports.createExternalEpisode = async (req, res) => {
  try {
    const podcastId = req.params.podcastId;
    const {
      name,
      description,
      language,
      release_date,
      audio_url, 
    } = req.body;

    const picture_url = req.file?.filename;
    if (!picture_url) {
      return res.status(400).json({ error: 'Episode image is required' });
    }

    let youtube_url = req.body.youtube_url;
    let finalName = name;
    let finalDescription = description;
    let finalAudioUrl = audio_url;
    let finalDuration = null;

    // extract metadata from youtube_url
    if (youtube_url) {
      try {
        const info = await youtubedl(youtube_url, {
          dumpSingleJson: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: [
            'referer:youtube.com',
            'user-agent:googlebot'
          ]
        });

        finalName = finalName || info.title;
        finalDescription = finalDescription || info.description;
        finalDuration = parseInt(info.duration);

        // extract and upload audio
        finalAudioUrl = await uploadAudioFromYoutube(youtube_url);
      } catch (err) {
        console.error('YouTube metadata extraction failed:', err);
        return res.status(400).json({ error: 'Invalid or unsupported YouTube link' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO episodes (
        podcast_id, name, description, picture_url,
        audio_url, youtube_url, duration, language, release_date, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        podcastId,
        finalName,
        finalDescription,
        picture_url,
        finalAudioUrl,
        youtube_url,
        finalDuration,
        language,
        release_date,
      ]
    );

    const episode = rows[0];
    
    let { speakers } = req.body;
    
    if (typeof speakers === 'string') {
      speakers = speakers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean); 
    }

    // speakers if provided
    if (Array.isArray(speakers)) {
      for (const speakerName of speakers) {
        const { rows: sRows } = await pool.query(
          `INSERT INTO speakers (name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [speakerName]
        );

        const speakerId = sRows[0].id;

        await pool.query(
          `INSERT INTO episode_speakers (episode_id, speaker_id)
           VALUES ($1, $2)`,
          [episode.id, speakerId]
        );
      }
    }

    // transcribe using Whisper AI
    try {
    const { script, transcript_json } = await transcribeAudioFromUrl(finalAudioUrl);
    
    // 🟡 Add debugging
    console.log('🔹 Whisper transcription result:');
    console.log('script preview:', script?.slice?.(0, 80));
    console.log('transcript_json is array?', Array.isArray(transcript_json));
    console.log('First word:', transcript_json?.[0]);
    console.log('Stringified:', JSON.stringify(transcript_json)?.slice?.(0, 100));

    // ✅ Save only if transcript_json is valid
    if (Array.isArray(transcript_json)) {
      await pool.query(
        `UPDATE episodes SET script = $1, transcript_json = $2 WHERE id = $3`,
        [script, JSON.stringify(transcript_json), episode.id]
      );
      episode.script = script;
      episode.transcript_json = transcript_json;
    } else {
      console.warn('⚠️ transcript_json is invalid. Skipping save to DB.');
    }

    // await pool.query(
    //     `UPDATE episodes SET script = $1, transcript_json = $2 WHERE id = $3`,
    //     [script, JSON.stringify(transcript_json), episode.id]
    // );

    // // attach transcript to response
    // episode.script = script;
    // episode.transcript_json = transcript_json;

    } catch (transcriptError) {
    console.error('Whisper transcription failed:', transcriptError);
    }

    res.status(201).json({ message: 'Episode created successfully', episode });
  } catch (err) {
    console.error('Error creating YouTube episode:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
};

exports.getEpisodesByPodcast = async (req, res) => {
  try {
    const podcastId = req.params.podcastId;
    const episodes = await ExternalEpisodeModel.getByPodcastId(podcastId);
    res.status(200).json( episodes );
  } catch (err) {
    console.error('Error fetching episodes:', err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
};

exports.getExternalEpisodeById = async (req, res) => {
  try {
    const id = req.params.id;
    const episode = await ExternalEpisodeModel.getById(id);

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.status(200).json({ episode });
  } catch (err) {
    console.error('Error fetching episode:', err);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
};

exports.deleteExternalEpisode = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await ExternalEpisodeModel.deleteById(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.status(200).json({ message: 'Episode deleted successfully' });
  } catch (err) {
    console.error('Error deleting episode:', err);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
};
