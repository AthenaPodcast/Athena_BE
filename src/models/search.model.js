const pool = require('../../db');

exports.searchAll = async ({ query, categories, languages, page, limit }) => {
  const offset = (page - 1) * limit;
  const q = `%${query}%`;

  // filters
  const episodeFilters = [`e.name ILIKE $1`];
  const podcastFilters = [`p.name ILIKE $1`];
  const channelFilters = [`cp.channel_name ILIKE $1`];

  const episodeParams = [q];
  const podcastParams = [q];
  const channelParams = [q];

  let paramIndex = 2;

  if (categories.length > 0) {
    episodeFilters.push(`pc.category_id = ANY($${paramIndex})`);
    podcastFilters.push(`pc.category_id = ANY($${paramIndex})`);
    episodeParams.push(categories);
    podcastParams.push(categories);
    paramIndex++;
  }

  if (languages.length > 0) {
    episodeFilters.push(`e.language = ANY($${paramIndex})`);
    episodeParams.push(languages);
  }

  // episodes
  const episodes = await pool.query(`
    SELECT 
      e.id, e.name, e.picture_url, p.name AS podcast_name, 
      'episode' AS type,
      cp.created_by_admin AS is_external
    FROM episodes e
    JOIN podcasts p ON p.id = e.podcast_id
    JOIN channelprofile cp ON cp.id = p.channel_id
    LEFT JOIN podcastcategory pc ON pc.podcast_id = p.id
    WHERE ${episodeFilters.join(' AND ')}
    GROUP BY e.id, p.name, cp.created_by_admin
  `, episodeParams);

  // podcasts
  const podcasts = await pool.query(`
    SELECT 
      p.id, p.name, p.picture_url, cp.channel_name, 
      'podcast' AS type,
      cp.created_by_admin AS is_external
    FROM podcasts p
    JOIN channelprofile cp ON cp.id = p.channel_id
    LEFT JOIN podcastcategory pc ON pc.podcast_id = p.id
    WHERE ${podcastFilters.join(' AND ')}
    GROUP BY p.id, cp.channel_name, cp.created_by_admin
  `, podcastParams);

  // channels
  const channels = await pool.query(`
    SELECT 
      cp.id, cp.channel_name AS name, cp.channel_picture AS picture_url, 
      'channel' AS type,
      cp.created_by_admin AS is_external
    FROM channelprofile cp
    WHERE ${channelFilters.join(' AND ')}
  `, channelParams);

  // combine all and inject content_type
  const allResults = [
    ...episodes.rows.map(r => ({ ...r, content_type: r.is_external ? 'external' : 'regular' })),
    ...podcasts.rows.map(r => ({ ...r, content_type: r.is_external ? 'external' : 'regular' })),
    ...channels.rows.map(r => ({ ...r, content_type: r.is_external ? 'external' : 'regular' })),
  ];

  const totalCount = allResults.length;
  const paginated = allResults.slice(offset, offset + limit);

  return {
    page,
    limit,
    total_count: totalCount,
    results: paginated
  };
};

exports.getSuggestions = async (query) => {
  const q = `%${query}%`;

  // suggest episode names
  const episodes = await pool.query(
    `SELECT DISTINCT e.name 
     FROM episodes e 
     WHERE e.name ILIKE $1 
     LIMIT 5`, [q]
  );

  // suggest podcast names
  const podcasts = await pool.query(
    `SELECT DISTINCT p.name 
     FROM podcasts p 
     WHERE p.name ILIKE $1 
     LIMIT 5`, [q]
  );

  // suggest channel names
  const channels = await pool.query(
    `SELECT DISTINCT cp.channel_name AS name 
     FROM channelprofile cp 
     WHERE cp.channel_name ILIKE $1 
     LIMIT 5`, [q]
  );

  return {
    episodes: episodes.rows.map(r => r.name),
    podcasts: podcasts.rows.map(r => r.name),
    channels: channels.rows.map(r => r.name)
  };
};
