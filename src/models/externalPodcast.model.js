const pool = require('../../db');

const ExternalPodcastModel = {
  async create({ channel_id, name, description, picture_url, category_ids }) {
    const result = await pool.query(
      `INSERT INTO podcasts (channel_id, name, description, picture_url, created_at, updated_at, created_by_admin)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true) 
       RETURNING *`,
      [channel_id, name, description, picture_url]
    );

    const podcast = result.rows[0];
    const insertedCategories = [];

    for (const categoryId of category_ids) {
        await pool.query(
        `INSERT INTO podcastcategory (podcast_id, category_id) VALUES ($1, $2)`,
        [podcast.id, categoryId]
        );
        
        const { rows } = await pool.query(
            `SELECT id, name FROM categories WHERE id = $1`,
            [categoryId]
        );

        if (rows.length > 0) {
            insertedCategories.push(rows[0]); 
        }
    }
  
    podcast.categories = insertedCategories;
    return podcast;
  },

  async getByChannel(channel_id) {
    const result = await pool.query(
        `SELECT p.*, 
        COALESCE(
            json_agg(
            json_build_object('id', c.id, 'name', c.name)
            ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories
        FROM podcasts p
        LEFT JOIN podcastcategory pc ON p.id = pc.podcast_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.channel_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC`, 
        [channel_id]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(
      `SELECT p.*, 
          COALESCE(
              json_agg(
              json_build_object('id', c.id, 'name', c.name)
              ) FILTER (WHERE c.id IS NOT NULL), '[]'
          ) AS categories,
          (SELECT COUNT(*)::int FROM episodes e WHERE e.podcast_id = p.id) AS episode_count
        FROM podcasts p
        LEFT JOIN podcastcategory pc ON p.id = pc.podcast_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.id = $1
        GROUP BY p.id`, 
        [id]
    );
    return result.rows[0] || null;
  },

  async deleteById(id) {
    await pool.query(
        `DELETE FROM podcastcategory 
        WHERE podcast_id = $1`, 
        [id]
    );
    const result = await pool.query(
      `DELETE FROM podcasts WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }
};

module.exports = ExternalPodcastModel;
