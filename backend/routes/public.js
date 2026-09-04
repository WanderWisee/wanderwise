const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/plan/:shareToken
// No login required — this is the "Invite your crew" link, and doubles as
// the read-only link a faculty member can open to see which places in the
// itinerary were marked visited (proof the student actually went).
router.get('/:shareToken', async (req, res) => {
  const [tripRows] = await pool.query('SELECT * FROM trips WHERE share_token = ?', [
    req.params.shareToken,
  ]);
  if (tripRows.length === 0) return res.status(404).json({ error: 'Trip not found' });

  const trip = tripRows[0];
  const [places] = await pool.query(
    'SELECT * FROM trip_places WHERE trip_id = ? ORDER BY itinerary_date, sort_order',
    [trip.id]
  );

  res.json({ ...trip, places });
});

module.exports = router;
