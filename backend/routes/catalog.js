const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/destinations?featured=true  -> Top Destinations / Travel Tips grids
router.get('/destinations', async (req, res) => {
  const featuredOnly = req.query.featured === 'true';
  const sql = featuredOnly
    ? 'SELECT * FROM destinations WHERE is_featured = TRUE'
    : 'SELECT * FROM destinations';
  const [rows] = await pool.query(sql);
  res.json(rows);
});

// GET /api/destinations/:id/guide  -> "Singapore Travel Journey"-style guide content
router.get('/destinations/:id/guide', async (req, res) => {
  const [guides] = await pool.query(
    'SELECT * FROM travel_guides WHERE destination_id = ? ORDER BY sort_order',
    [req.params.id]
  );

  const guidesWithHotels = await Promise.all(
    guides.map(async (guide) => {
      const [hotelOptions] = await pool.query(
        'SELECT * FROM guide_hotel_options WHERE guide_id = ?',
        [guide.id]
      );
      return { ...guide, hotelOptions };
    })
  );

  res.json(guidesWithHotels);
});

// GET /api/hotels?destinationId=&minPrice=&maxPrice=  -> Hotel search results
router.get('/hotels', async (req, res) => {
  const { destinationId, minPrice, maxPrice } = req.query;
  const conditions = [];
  const values = [];

  if (destinationId) {
    conditions.push('destination_id = ?');
    values.push(destinationId);
  }
  if (minPrice) {
    conditions.push('price_per_night >= ?');
    values.push(minPrice);
  }
  if (maxPrice) {
    conditions.push('price_per_night <= ?');
    values.push(maxPrice);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM hotels ${where} ORDER BY price_per_night ASC`,
    values
  );
  res.json(rows);
});

module.exports = router;
