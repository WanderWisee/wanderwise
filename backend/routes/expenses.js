const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function assertTripOwnership(tripId, userId) {
  const [rows] = await pool.query('SELECT id FROM trips WHERE id = ? AND user_id = ?', [
    tripId,
    userId,
  ]);
  return rows.length > 0;
}

// GET /api/trips/:tripId/expenses
router.get('/:tripId/expenses', requireAuth, async (req, res) => {
  if (!(await assertTripOwnership(req.params.tripId, req.user.id))) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  const [rows] = await pool.query(
    'SELECT * FROM expenses WHERE trip_id = ? ORDER BY expense_date, created_at',
    [req.params.tripId]
  );
  res.json(rows);
});

// POST /api/trips/:tripId/expenses  -> "Add Expense"
router.post('/:tripId/expenses', requireAuth, async (req, res) => {
  if (!(await assertTripOwnership(req.params.tripId, req.user.id))) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const { placeId, category, amount, description, expenseDate } = req.body;
  if (!category || !amount) {
    return res.status(400).json({ error: 'Category and amount are required' });
  }

  const [result] = await pool.query(
    `INSERT INTO expenses (trip_id, place_id, category, amount, description, expense_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.params.tripId, placeId || null, category, amount, description || null, expenseDate || null]
  );

  const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// GET /api/trips/:tripId/expenses/breakdown  -> data for the "Breakdown" charts
router.get('/:tripId/expenses/breakdown', requireAuth, async (req, res) => {
  if (!(await assertTripOwnership(req.params.tripId, req.user.id))) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const [byCategory] = await pool.query(
    `SELECT category, SUM(amount) AS total
     FROM expenses WHERE trip_id = ? GROUP BY category`,
    [req.params.tripId]
  );
  const [byDay] = await pool.query(
    `SELECT expense_date, SUM(amount) AS total
     FROM expenses WHERE trip_id = ? GROUP BY expense_date ORDER BY expense_date`,
    [req.params.tripId]
  );

  res.json({ byCategory, byDay });
});

module.exports = router;
