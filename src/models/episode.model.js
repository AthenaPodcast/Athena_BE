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

// Get all episodes for a given podcast ID
exports.getEpisodesByPodcastId = async (podcastId) => {
  const query = `
    SELECT id, name, description, picture_url, audio_url, duration, release_date
    FROM episodes
    WHERE podcast_id = $1
    ORDER BY release_date DESC;
  `;

  const result = await pool.query(query, [podcastId]);
  return result.rows;
};

// Fetch episode details
exports.getEpisodeDetails = async (episode_id) => {
  const query = `
    SELECT 
      e.id AS episode_id,
      e.name AS episode_name,
      e.description AS episode_description,
      e.audio_url,
      e.duration,
      e.release_date,
      p.id AS podcast_id,
      p.name AS podcast_name,
      p.picture_url AS podcast_picture,
      json_agg(json_build_object('id', c.id, 'name', c.name)) AS categories
    FROM episodes e
    JOIN podcasts p ON e.podcast_id = p.id
    LEFT JOIN podcastcategory pc ON pc.podcast_id = p.id
    LEFT JOIN categories c ON c.id = pc.category_id
    WHERE e.id = $1
    GROUP BY e.id, p.id;
  `;
  
  const result = await pool.query(query, [episode_id]);
  return result.rows[0];
};
