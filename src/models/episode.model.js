const pool = require('../../db');

const createEpisode = async (episodeData) => {
  const {
    podcast_id,
    name,
    description,
    picture_url,
    audio_url,
    duration,
    script,
    transcript_json,
    release_date,
    language
  } = episodeData;

  // Ensure transcript_json is a proper array and not undefined
  const safeTranscriptJson = Array.isArray(transcript_json) ? transcript_json : [];
  
  // Validate transcript_json structure
  const validTranscriptJson = safeTranscriptJson.map(word => {
    // Make sure each word has the required properties
    return {
      word: String(word.word || ''),
      start: Number(word.start || 0),
      end: Number(word.end || 0)
    };
  });
  
  console.log('Processing transcript with', validTranscriptJson.length, 'words');
  
  // Explicitly stringify the JSON to ensure correct format
  const jsonString = JSON.stringify(validTranscriptJson);

  const query = `
    INSERT INTO episodes (
      podcast_id, name, description, picture_url,
      audio_url, duration, script, transcript_json, release_date, language
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
    RETURNING *;
  `;

  const values = [
    podcast_id, name, description, picture_url,
    audio_url, duration, script, jsonString, release_date, language
  ];

  try {
    const result = await pool.query(query, values);
    
    // Verify the transcript_json was properly inserted
    if (result.rows[0] && result.rows[0].transcript_json) {
      console.log('Inserted transcript length:', 
                  Array.isArray(result.rows[0].transcript_json) 
                    ? result.rows[0].transcript_json.length 
                    : 'Not an array');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error in createEpisode:', error);
    throw error;
  }
};

// Get all episodes for a given podcast ID
const getEpisodesByPodcastId = async (podcastId) => {
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
const getEpisodeDetails = async (episode_id) => {
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

// Like or unlike an episode (toggle)
const toggleEpisodeLike = async (accountId, episodeId) => {
  const result = await pool.query(
    'SELECT liked FROM episode_likes WHERE account_id = $1 AND episode_id = $2',
    [accountId, episodeId]
  );

  if (result.rows.length > 0) {
    const newStatus = !result.rows[0].liked;

    await pool.query(
      'UPDATE episode_likes SET liked = $1 WHERE account_id = $2 AND episode_id = $3',
      [newStatus, accountId, episodeId]
    );

    return newStatus;
  } else {
    await pool.query(
      'INSERT INTO episode_likes (account_id, episode_id, liked) VALUES ($1, $2, true)',
      [accountId, episodeId]
    );

    return true;
  }
};

// get episode like status 
const getEpisodeLike = async (accountId, episodeId) => {
  const query = `
    SELECT liked FROM episode_likes
    WHERE account_id = $1 AND episode_id = $2
  `;
  const result = await pool.query(query, [accountId, episodeId]);
  return result.rows[0] || null;
};

// get list of liked episodes 
const getLikedEpisodes = async (accountId) => {
  const query = `
    SELECT 
      e.id AS episode_id,
      e.name AS episode_name,
      e.picture_url AS episode_picture,
      p.name AS podcast_name
    FROM episode_likes el
    JOIN episodes e ON el.episode_id = e.id
    JOIN podcasts p ON e.podcast_id = p.id
    WHERE el.account_id = $1 AND el.liked = true
    ORDER BY e.created_at DESC
  `;
  const result = await pool.query(query, [accountId]);
  return result.rows;
};

// count of liked episodes 
const countLikedEpisodes = async (accountId) => {
  const query = `
    SELECT COUNT(*) FROM episode_likes
    WHERE account_id = $1 AND liked = true
  `;
  const result = await pool.query(query, [accountId]);
  return parseInt(result.rows[0].count);
};

// episode script
const updateEpisodeScript = async (episodeId, scriptText) => {
  const query = `UPDATE episodes SET script = $1 WHERE id = $2 RETURNING *`;
  const values = [scriptText, episodeId];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getEpisodeById = async (episodeId) => {
  const result = await pool.query(
    `
    SELECT e.id, e.name, e.script, e.language, e.podcast_id,
           p.name AS podcast_name,
           COALESCE(
             json_agg(s.name) FILTER (WHERE s.id IS NOT NULL), '[]'
           ) AS speakers
    FROM episodes e
    JOIN podcasts p ON p.id = e.podcast_id
    LEFT JOIN episode_speakers es ON es.episode_id = e.id
    LEFT JOIN speakers s ON s.id = es.speaker_id
    WHERE e.id = $1
    GROUP BY e.id, p.name;
    `,
    [episodeId]
  );

  return result.rows[0];
};

const getRecommendationsByCategory = async (episodeId) => {
  const result = await pool.query(
    `
    SELECT ep.id, ep.name, ep.description
    FROM episodes ep
    JOIN podcasts p ON p.id = ep.podcast_id
    WHERE p.category_id = (
      SELECT p.category_id
      FROM episodes e
      JOIN podcasts p ON p.id = e.podcast_id
      WHERE e.id = $1
    )
    AND ep.id != $1
    ORDER BY RANDOM()
    LIMIT 3
    `,
    [episodeId]
  );
  return result.rows;
};

const getPreviousEpisode = async (episodeId) => {
  const result = await pool.query(
    `
    SELECT e2.id, e2.name, e2.script
    FROM episodes e1
    JOIN episodes e2 ON e1.podcast_id = e2.podcast_id
    WHERE e1.id = $1
      AND e2.release_date < e1.release_date
    ORDER BY e2.release_date DESC
    LIMIT 1
    `,
    [episodeId]
  );
  return result.rows[0];
};

const getPaginatedLatestEpisodes = async (page, limit) => {
  const offset = (page - 1) * limit;

  const data = await pool.query(`
    SELECT e.id, e.name, e.picture_url, e.created_at,
           p.name AS podcast_name,
           cp.created_by_admin AS is_external
    FROM episodes e
    JOIN podcasts p ON p.id = e.podcast_id
    JOIN channelprofile cp ON cp.id = p.channel_id
    ORDER BY e.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  // get total count
  const countResult = await pool.query(`SELECT COUNT(*) FROM episodes`);
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  const episodes = data.rows.map(row => ({
    ...row,
    type: row.is_external ? 'external' : 'regular'
  }));

  return {
    episodes,
    total_pages: totalPages,
    total_count: totalCount
  };
};


module.exports = {
  createEpisode,
  getEpisodesByPodcastId,
  getEpisodeDetails,
  toggleEpisodeLike,
  getEpisodeLike,
  getLikedEpisodes,
  countLikedEpisodes,
  updateEpisodeScript,
  getEpisodeById,
  getRecommendationsByCategory,
  getPreviousEpisode,
  getPaginatedLatestEpisodes
};
