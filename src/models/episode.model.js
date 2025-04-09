const pool = require('../../db');

exports.createEpisode = async (episodeData) => {
  const {
    podcast_id,
    name,
    description,
    picture_url,
    audio_url,
    duration,
    script,
    release_date,
  } = episodeData;

  const query = `
    INSERT INTO episodes (
      podcast_id, name, description, picture_url,
      audio_url, duration, script, release_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    podcast_id, name, description, picture_url,
    audio_url, duration, script, release_date
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
