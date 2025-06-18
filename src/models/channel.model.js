const pool = require('../../db');

// podcasts
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

exports.getChannelsByCategories = async (isExternal, categoryIds, page, limit) => {
  const offset = (page - 1) * limit;

  const result = await pool.query(`
    SELECT DISTINCT cp.*
    FROM channelprofile cp
    JOIN podcasts p ON p.channel_id = cp.id
    JOIN podcastcategory pc ON pc.podcast_id = p.id
    WHERE cp.created_by_admin = $1
      AND pc.category_id = ANY($2)
    LIMIT $3 OFFSET $4
  `, [isExternal, categoryIds, limit, offset]);

  const countResult = await pool.query(`
    SELECT COUNT(DISTINCT cp.id) AS count
    FROM channelprofile cp
    JOIN podcasts p ON p.channel_id = cp.id
    JOIN podcastcategory pc ON pc.podcast_id = p.id
    WHERE cp.created_by_admin = $1
      AND pc.category_id = ANY($2)
  `, [isExternal, categoryIds]);

  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    channels: result.rows,
    total_pages: totalPages,
    total_count: totalCount
  };
};

exports.getChannelInfoById = async (channelId) => {
  const result = await pool.query(`
    SELECT 
      cp.id,
      cp.channel_name,
      cp.channel_picture,
      cp.channel_description,
      cp.created_by_admin AS is_external,
      COUNT(p.id) AS podcast_count
    FROM channelprofile cp
    LEFT JOIN podcasts p ON p.channel_id = cp.id
    WHERE cp.id = $1
    GROUP BY cp.id
  `, [channelId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.channel_name,
    picture: row.channel_picture,
    description: row.channel_description,
    type: row.is_external ? 'external' : 'regular',
    podcast_count: parseInt(row.podcast_count, 10)
  };
};

exports.getPaginatedPodcastsUnderChannel = async (channelId, page, limit) => {
  const offset = (page - 1) * limit;

  // 1. Paginated query
  const result = await pool.query(`
    SELECT 
      p.id,
      p.name,
      p.picture_url,
      cp.created_by_admin AS is_external
    FROM podcasts p
    JOIN channelprofile cp ON cp.id = p.channel_id
    WHERE cp.id = $1
    ORDER BY p.id DESC
    LIMIT $2 OFFSET $3
  `, [channelId, limit, offset]);

  // 2. Count total
  const countRes = await pool.query(`
    SELECT COUNT(*) FROM podcasts WHERE channel_id = $1
  `, [channelId]);

  const totalCount = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  const podcasts = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    picture_url: row.picture_url,
    type: row.is_external ? 'external' : 'regular'
  }));

  return {
    page,
    limit,
    total_count: totalCount,
    total_pages: totalPages,
    podcasts
  };
};

exports.getPublicPodcast = async (podcastId, accountId) => {
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
      COALESCE(array_agg(DISTINCT e.language) FILTER (WHERE e.language IS NOT NULL), '{}') AS episode_languages,
      cp.created_by_admin AS is_external,
      EXISTS (
        SELECT 1 FROM podcast_saves s
        WHERE s.podcast_id = p.id AND s.account_id = $2 AND s.saved = true
      ) AS is_saved
    FROM podcasts p
    LEFT JOIN episodes e ON e.podcast_id = p.id
    LEFT JOIN podcast_saves ps ON ps.podcast_id = p.id AND ps.saved = true
    JOIN channelprofile cp ON p.channel_id = cp.id
    WHERE p.id = $1
    GROUP BY p.id, cp.created_by_admin
    `,
    [podcastId, accountId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    type: row.is_external ? 'external' : 'regular',
    is_saved: row.is_saved
  };
};

exports.getPublicPodcastEpisodesPaginated = async (podcastId, page = 1, limit = 6) => {
  const offset = (page - 1) * limit;

  const data = await pool.query(
    `
    SELECT 
      e.id, 
      e.name, 
      e.picture_url, 
      e.duration, 
      e.release_date,
      cp.created_by_admin AS is_external
    FROM episodes e
    JOIN podcasts p ON e.podcast_id = p.id
    JOIN channelprofile cp ON p.channel_id = cp.id
    WHERE p.id = $1
    ORDER BY e.release_date DESC
    LIMIT $2 OFFSET $3
    `,
    [podcastId, limit, offset]
  );

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM episodes WHERE podcast_id = $1`,
    [podcastId]
  );

  const totalCount = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  const episodes = data.rows.map(row => ({
    id: row.id,
    name: row.name,
    picture_url: row.picture_url,
    duration: row.duration,
    release_date: row.release_date,
    type: row.is_external ? 'external' : 'regular'
  }));

  return {
    page,
    limit,
    total_count: totalCount,
    total_pages: totalPages,
    episodes
  };
};

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
    await pool.query(`DELETE FROM ad_play_logs WHERE episode_id = $1`, [episodeId]);
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

// episodes
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
  const episodeQuery = `
    SELECT e.*, 
           COALESCE(like_count.count, 0) AS like_count,
           COALESCE(avg_reviews.avg_rating, 0) AS avg_rating
    FROM episodes e
    JOIN podcasts p ON e.podcast_id = p.id
    JOIN channelprofile c ON p.channel_id = c.id
    LEFT JOIN (
      SELECT episode_id, COUNT(*) AS count
      FROM episode_likes
      WHERE liked = true
      GROUP BY episode_id
    ) AS like_count ON e.id = like_count.episode_id
    LEFT JOIN (
      SELECT episode_id, ROUND(AVG(rating), 2) AS avg_rating
      FROM reviews
      GROUP BY episode_id
    ) AS avg_reviews ON e.id = avg_reviews.episode_id
    WHERE e.id = $1 AND c.account_id = $2
  `;
  const episodeResult = await pool.query(episodeQuery, [episodeId, accountId]);
  if (episodeResult.rows.length === 0) return null;

  const episode = episodeResult.rows[0];

  const speakersQuery = `
    SELECT s.name
    FROM speakers s
    JOIN episode_speakers es ON s.id = es.speaker_id
    WHERE es.episode_id = $1
  `;
  const speakersResult = await pool.query(speakersQuery, [episodeId]);
  episode.speakers = speakersResult.rows.map(r => r.name);

  const reviewsQuery = `
    SELECT r.id, r.comment_text, r.rating, r.created_at,
           CONCAT(u.first_name, ' ', u.last_name) AS user_name
    FROM reviews r
    JOIN userprofile u ON r.account_id = u.account_id
    WHERE r.episode_id = $1
    ORDER BY r.created_at DESC
  `;
  const reviewsResult = await pool.query(reviewsQuery, [episodeId]);
  episode.reviews = reviewsResult.rows;

  return episode;
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkOwner = await client.query(
      `SELECT e.id FROM episodes e
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN channelprofile c ON p.channel_id = c.id
       WHERE e.id = $1 AND c.account_id = $2`,
      [episodeId, accountId]
    );
    if (checkOwner.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
    await client.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
    await client.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
    await client.query(`DELETE FROM ad_play_logs WHERE episode_id = $1`, [episodeId]);
    await client.query(`DELETE FROM episode_speakers WHERE episode_id = $1`, [episodeId]);

    const result = await client.query(
      `DELETE FROM episodes WHERE id = $1 RETURNING *`,
      [episodeId]
    );

    await client.query('COMMIT');
    return result.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete episode failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

// profile
exports.getChannelProfileByAccountId = async (accountId) => {
  const result = await pool.query(
    `SELECT 
      c.*,
      a.email,
      a.phone,
      (
        SELECT COUNT(*) FROM podcasts p WHERE p.channel_id = c.id
      ) AS total_podcasts,
      (
        SELECT COUNT(*) FROM episodes e
        JOIN podcasts p ON e.podcast_id = p.id
        WHERE p.channel_id = c.id
      ) AS total_episodes,
      (
        SELECT COUNT(*) FROM podcast_saves ps
        JOIN podcasts p ON ps.podcast_id = p.id
        WHERE p.channel_id = c.id
      ) AS total_saved_podcasts,
      (
        SELECT COUNT(*) FROM episode_likes el
        JOIN episodes e ON el.episode_id = e.id
        JOIN podcasts p ON e.podcast_id = p.id
        WHERE p.channel_id = c.id
      ) AS total_liked_episodes
    FROM channelprofile c
    JOIN accounts a ON c.account_id = a.id
    WHERE c.account_id = $1;`,
    [accountId]
  );
  return result.rows[0];
};

exports.updateChannelProfileByAccountId = async (accountId, updates) => {
  const { channel_name, channel_description, phone } = updates;

  await pool.query('BEGIN');

  try {
    await pool.query(
      `UPDATE channelprofile
       SET channel_name = COALESCE($1, channel_name),
           channel_description = COALESCE($2, channel_description)
       WHERE account_id = $3`,
      [channel_name, channel_description, accountId]
    );

    await pool.query(
      `UPDATE accounts
       SET phone = COALESCE($1, phone)
       WHERE id = $2`,
      [phone, accountId]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
};