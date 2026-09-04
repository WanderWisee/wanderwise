const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function generateShareToken() {
  return crypto.randomBytes(6).toString('hex'); // e.g. "wdfse2326"-style short id
}

// GET /api/trips  -> all trips belonging to the logged-in user
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/trips  -> create a new trip (from the "Start Planning" form)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, destination, startDate, endDate, travelBuddiesCount } = req.body;
    const shareToken = generateShareToken();

    const [result] = await pool.query(
      `INSERT INTO trips (user_id, title, destination, start_date, end_date, travel_buddies_count, share_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title || `Trip to ${destination || ''}`,
        destination || null,
        startDate || null,
        endDate || null,
        travelBuddiesCount || 0,
        shareToken,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/trips/:id  -> one trip, with its sections and places
router.get('/:id', requireAuth, async (req, res) => {
  const [tripRows] = await pool.query(
    'SELECT * FROM trips WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (tripRows.length === 0) return res.status(404).json({ error: 'Trip not found' });

  const [sections] = await pool.query(
    'SELECT * FROM trip_sections WHERE trip_id = ? ORDER BY sort_order',
    [req.params.id]
  );
  const [places] = await pool.query(
    'SELECT * FROM trip_places WHERE trip_id = ? ORDER BY itinerary_date, sort_order',
    [req.params.id]
  );
  const [members] = await pool.query(
    'SELECT * FROM trip_members WHERE trip_id = ?',
    [req.params.id]
  );

  res.json({ ...tripRows[0], sections, places, members });
});

// PUT /api/trips/:id  -> edit trip details (title, dates, budget, etc.)
router.put('/:id', requireAuth, async (req, res) => {
  const { title, destination, startDate, endDate, travelBuddiesCount, budgetTotal } = req.body;
  const [owned] = await pool.query('SELECT id FROM trips WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);
  if (owned.length === 0) return res.status(404).json({ error: 'Trip not found' });

  await pool.query(
    `UPDATE trips SET
      title = COALESCE(?, title),
      destination = COALESCE(?, destination),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      travel_buddies_count = COALESCE(?, travel_buddies_count),
      budget_total = COALESCE(?, budget_total)
     WHERE id = ?`,
    [title, destination, startDate, endDate, travelBuddiesCount, budgetTotal, req.params.id]
  );

  const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/trips/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const [result] = await pool.query('DELETE FROM trips WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);
  res.json({ deleted: result.affectedRows > 0 });
});

// ---------- Places (Where to go? / Itinerary days) ----------

// POST /api/trips/:id/places  -> add a new place ("Add a new place")
router.post('/:id/places', requireAuth, async (req, res) => {
  const { sectionId, itineraryDate, name, latitude, longitude, notes, scheduledTime, cost } =
    req.body;

  const [owned] = await pool.query('SELECT id FROM trips WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);
  if (owned.length === 0) return res.status(404).json({ error: 'Trip not found' });

  const [result] = await pool.query(
    `INSERT INTO trip_places
      (trip_id, section_id, itinerary_date, name, latitude, longitude, notes, scheduled_time, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      sectionId || null,
      itineraryDate || null,
      name,
      latitude || null,
      longitude || null,
      notes || null,
      scheduledTime || null,
      cost || 0,
    ]
  );

  const [rows] = await pool.query('SELECT * FROM trip_places WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/places/:placeId  -> edit a place, including "Mark visited"
router.put('/places/:placeId', requireAuth, async (req, res) => {
  const { notes, scheduledTime, cost, visited } = req.body;

  // Confirm this place belongs to a trip owned by the logged-in user
  const [rows] = await pool.query(
    `SELECT tp.* FROM trip_places tp
     JOIN trips t ON t.id = tp.trip_id
     WHERE tp.id = ? AND t.user_id = ?`,
    [req.params.placeId, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Place not found' });

  const visitedAt = visited ? new Date() : null;

  await pool.query(
    `UPDATE trip_places SET
      notes = COALESCE(?, notes),
      scheduled_time = COALESCE(?, scheduled_time),
      cost = COALESCE(?, cost),
      visited = COALESCE(?, visited),
      visited_at = CASE WHEN ? THEN ? ELSE visited_at END
     WHERE id = ?`,
    [notes, scheduledTime, cost, visited, visited, visitedAt, req.params.placeId]
  );

  const [updated] = await pool.query('SELECT * FROM trip_places WHERE id = ?', [
    req.params.placeId,
  ]);
  res.json(updated[0]);
});

// DELETE /api/places/:placeId
router.delete('/places/:placeId', requireAuth, async (req, res) => {
  const [result] = await pool.query(
    `DELETE tp FROM trip_places tp
     JOIN trips t ON t.id = tp.trip_id
     WHERE tp.id = ? AND t.user_id = ?`,
    [req.params.placeId, req.user.id]
  );
  res.json({ deleted: result.affectedRows > 0 });
});

// ---------- Crew invites ----------

// POST /api/trips/:id/members  -> "Invite your crew"
router.post('/:id/members', requireAuth, async (req, res) => {
  const { invitedEmailOrName } = req.body;
  const [owned] = await pool.query('SELECT id FROM trips WHERE id = ? AND user_id = ?', [
    req.params.id,
    req.user.id,
  ]);
  if (owned.length === 0) return res.status(404).json({ error: 'Trip not found' });

  const [result] = await pool.query(
    'INSERT INTO trip_members (trip_id, invited_email_or_name) VALUES (?, ?)',
    [req.params.id, invitedEmailOrName]
  );
  const [rows] = await pool.query('SELECT * FROM trip_members WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

module.exports = router;
