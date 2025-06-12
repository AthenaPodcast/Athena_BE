const pool = require('../../db');

// --- PODCASTS ---

// fully done 
exports.insertPodcast = async (accountId, name, description, picture_url, category_ids = []) => {
  const channelRes = await pool.query(
    `SELECT id FROM channelprofile WHERE account_id = $1`,
    [accountId]
  );
  if (channelRes.rows.length === 0) {
    throw new Error('Channel profile not found');
  }

  const channelId = channelRes.rows[0].id;

  const podcastRes = await pool.query(
    `INSERT INTO podcasts (channel_id, name, description, picture_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [channelId, name, description, picture_url]
  );

  const podcast = podcastRes.rows[0];
  
  for (const catId of category_ids) {
    await pool.query(
        `INSERT INTO podcastcategory (podcast_id, category_id, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
         [podcast.id, catId]
        );
    }

  return podcast;
};

// fully done
exports.getPodcastsByChannel = async (accountId) => {
  const result = await pool.query(
    `
    SELECT p.*
    FROM podcasts p
    JOIN channelprofile c ON p.channel_id = c.id
    WHERE c.account_id = $1
    ORDER BY p.created_at DESC
    `,
    [accountId]
  );
  return result.rows;
};

// fully done
exports.getPodcast = async (podcastId, accountId) => {
  const result = await pool.query(
    `
    WITH unique_categories AS (
      SELECT DISTINCT c.id, c.name
      FROM podcastcategory pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.podcast_id = $1
    )
    SELECT 
      p.*, 
      (
        SELECT json_agg(json_build_object('id', uc.id, 'name', uc.name))
        FROM unique_categories uc
      ) AS categories,
      COUNT(DISTINCT e.id) AS total_episodes,
      COUNT(DISTINCT ps.account_id) AS total_saves,
      COALESCE(array_agg(DISTINCT e.language) FILTER (WHERE e.language IS NOT NULL), '{}') AS episode_languages
    FROM podcasts p
    LEFT JOIN episodes e ON e.podcast_id = p.id
    LEFT JOIN podcast_saves ps ON ps.podcast_id = p.id AND ps.saved = true
    JOIN channelprofile cp ON p.channel_id = cp.id
    WHERE p.id = $1 AND cp.account_id = $2
    GROUP BY p.id
    `,
    [podcastId, accountId]
  );
  return result.rows[0];
};

// fully done
exports.updatePodcastById = async (podcastId, accountId, updates) => {
  const { name, description, picture_url, category_ids } = updates;

  const result = await pool.query(
    `UPDATE podcasts p
     SET 
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       picture_url = COALESCE($3, picture_url)
     FROM channelprofile c
     WHERE p.channel_id = c.id
       AND p.id = $4 AND c.account_id = $5
     RETURNING p.*`,
    [name ?? null, description ?? null, picture_url ?? null, podcastId, accountId]
  );

  const podcast = result.rows[0];
  if (!podcast) return null;

  if (Array.isArray(category_ids)) {
    await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);
    for (const catId of category_ids) {
      await pool.query(
        `INSERT INTO podcastcategory (podcast_id, category_id, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [podcastId, catId]
      );
    }
  }

  return podcast;
};

// fully done 
exports.deletePodcastById = async (podcastId, accountId) => {
  const checkRes = await pool.query(
    `SELECT p.id
     FROM podcasts p
     JOIN channelprofile c ON p.channel_id = c.id
     WHERE p.id = $1 AND c.account_id = $2`,
    [podcastId, accountId]
  );
  if (checkRes.rows.length === 0) return false;

  const episodeRes = await pool.query(
    `SELECT id FROM episodes WHERE podcast_id = $1`,
    [podcastId]
  );
  const episodeIds = episodeRes.rows.map(row => row.id);

  for (const episodeId of episodeIds) {
    await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM episode_speakers WHERE episode_id = $1`, [episodeId]);
  }

  if (episodeIds.length > 0) {
    await pool.query(`DELETE FROM episodes WHERE id = ANY($1::int[])`, [episodeIds]);
  }

  await pool.query(`DELETE FROM podcast_saves WHERE podcast_id = $1`, [podcastId]);
  await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);
  await pool.query(`DELETE FROM podcasts WHERE id = $1`, [podcastId]);

  return true;
};

// --- EPISODES ---
// fully done
exports.getPodcastEpisodes = async (podcastId, accountId) => {
  const result = await pool.query(
    `SELECT e.id, e.name, e.picture_url, e.duration, e.release_date
     FROM episodes e
     JOIN podcasts p ON e.podcast_id = p.id
     JOIN channelprofile c ON p.channel_id = c.id
     WHERE p.id = $1 AND c.account_id = $2
     ORDER BY e.release_date DESC`,
    [podcastId, accountId]
  );
  return result.rows;
};

exports.getEpisode = async (episodeId, accountId) => {
  const result = await pool.query(
    `SELECT e.*
     FROM episodes e
     JOIN podcasts p ON e.podcast_id = p.id
     WHERE e.id = $1 AND p.channel_account_id = $2`,
    [episodeId, accountId]
  );
  return result.rows[0];
};

exports.updateEpisodeById = async (episodeId, accountId, updates) => {
  const { name, description, release_date } = updates;
  const result = await pool.query(
    `UPDATE episodes
     SET name = $1, description = $2, release_date = $3
     FROM podcasts p
     WHERE episodes.podcast_id = p.id AND episodes.id = $4 AND p.channel_account_id = $5
     RETURNING episodes.*`,
    [name, description, release_date, episodeId, accountId]
  );
  return result.rows[0];
};

exports.deleteEpisodeById = async (episodeId, accountId) => {
  const result = await pool.query(
    `DELETE FROM episodes
     USING podcasts p
     WHERE episodes.podcast_id = p.id
       AND episodes.id = $1
       AND p.channel_account_id = $2
     RETURNING episodes.*`,
    [episodeId, accountId]
  );
  return result.rows[0];
};

// --- PROFILE ---
exports.getChannelProfileByAccountId = async (accountId) => {
  const result = await pool.query(
    `SELECT * FROM channelprofile WHERE account_id = $1`,
    [accountId]
  );
  return result.rows[0];
};

exports.updateChannelProfileByAccountId = async (accountId, updates) => {
  const { name, description, image } = updates;
  await pool.query(
    `UPDATE channelprofile
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         image = COALESCE($3, image)
     WHERE account_id = $4`,
    [name, description, image, accountId]
  );
};
