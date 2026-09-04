const { verifyToken } = require('../utils/token');
const pool = require('../db/pool');

// Checks the "Authorization: Bearer <token>" header, and if valid,
// attaches the logged-in user to req.user so routes can use it.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [rows] = await pool.query(
    'SELECT id, student_number, date_of_birth, cellphone_number, created_at FROM users WHERE id = ?',
    [payload.sub]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = rows[0];
  next();
}

module.exports = { requireAuth };
