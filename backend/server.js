const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const expenseRoutes = require('./routes/expenses');
const catalogRoutes = require('./routes/catalog');
const notificationRoutes = require('./routes/notifications');
const publicRoutes = require('./routes/public');

const app = express();
app.use(cors());
app.use(express.json());

// Health check — confirms the server AND the database are both reachable
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/trips', expenseRoutes); // adds /api/trips/:tripId/expenses...
app.use('/api', catalogRoutes); // /api/destinations, /api/hotels
app.use('/api/notifications', notificationRoutes);
app.use('/api/plan', publicRoutes); // GET /api/plan/:shareToken (no login)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`WanderWise backend listening on port ${port}`);
});
