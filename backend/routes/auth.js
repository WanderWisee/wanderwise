const express = require('express');
const pool = require('../db/pool');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createToken } = require('../utils/token');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

// Accepts either "MM/DD/YYYY" (what the Register form's placeholder shows)
// or an already-correct "YYYY-MM-DD" (e.g. from an <input type="date">),
// and always returns "YYYY-MM-DD" for MySQL's DATE column.
function normalizeDob(rawDob) {
  if (!rawDob || typeof rawDob !== 'string') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
    return rawDob;
  }

  const match = rawDob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { studentNumber, dob, cellphone, password } = req.body;

    if (!studentNumber || !dob || !cellphone || !password) {
      return res.status(400).json({
        error: 'Student number, date of birth, cellphone number, and password are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedDob = normalizeDob(dob);
    if (!normalizedDob) {
      return res.status(400).json({ error: 'Date of birth must be in MM/DD/YYYY format' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE student_number = ?',
      [studentNumber.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this student number already exists' });
    }

    const passwordHash = hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO users (student_number, date_of_birth, cellphone_number, password_hash)
       VALUES (?, ?, ?, ?)`,
      [studentNumber.trim(), normalizedDob, cellphone, passwordHash]
    );

    const token = createToken({
      sub: result.insertId,
      studentNumber: studentNumber.trim(),
      exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
    });

    const [rows] = await pool.query(
      'SELECT id, student_number, date_of_birth, cellphone_number, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ user: sanitizeUser(rows[0]), token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { studentNumber, password } = req.body;

    if (!studentNumber || !password) {
      return res.status(400).json({ error: 'Student number and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE student_number = ?',
      [studentNumber.trim()]
    );
    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid student number or password' });
    }

    const token = createToken({
      sub: user.id,
      studentNumber: user.student_number,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    });

    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/me  (update date_of_birth / cellphone_number only)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { dob, cellphone } = req.body;
    const updates = [];
    const values = [];

    if (typeof dob === 'string') {
      const normalizedDob = normalizeDob(dob);
      if (!normalizedDob) {
        return res.status(400).json({ error: 'Date of birth must be in MM/DD/YYYY format' });
      }
      updates.push('date_of_birth = ?');
      values.push(normalizedDob);
    }
    if (typeof cellphone === 'string') {
      updates.push('cellphone_number = ?');
      values.push(cellphone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query(
      'SELECT id, student_number, date_of_birth, cellphone_number, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;