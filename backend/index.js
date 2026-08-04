const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { init, run, get, all } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'wanderwise-secret';
const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));

function createToken(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authorization.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existing = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (username, email, passwordHash, bio, location, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, 'Travel lover', 'Your city', new Date().toISOString()]
    );

    const user = await get('SELECT id, username, email, bio, location FROM users WHERE id = ?', [result.lastID]);
    const token = createToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const publicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      location: user.location,
    };

    const token = createToken(publicUser);
    return res.json({ token, user: publicUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to log in' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await get('SELECT id, username, email, bio, location FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to fetch user profile' });
  }
});

app.get('/api/trips', authenticate, async (req, res) => {
  const trips = await all('SELECT id, title, destination, travelDate, createdAt FROM trips WHERE userId = ? ORDER BY createdAt DESC', [req.userId]);
  res.json({ trips });
});

app.post('/api/trips', authenticate, async (req, res) => {
  try {
    const { title, destination, travelDate } = req.body;
    if (!title || !destination) {
      return res.status(400).json({ error: 'Title and destination are required' });
    }

    const result = await run(
      'INSERT INTO trips (userId, title, destination, travelDate, createdAt) VALUES (?, ?, ?, ?, ?)',
      [req.userId, title, destination, travelDate || null, new Date().toISOString()]
    );

    const trip = await get('SELECT id, title, destination, travelDate, createdAt FROM trips WHERE id = ?', [result.lastID]);
    return res.json({ trip });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to create trip' });
  }
});

app.get('/api/destinations', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  const destinations = await all(
    'SELECT id, name, location, imageUrl, description, lowestPrice FROM destinations WHERE name LIKE ? OR location LIKE ? ORDER BY id',
    [search, search]
  );
  return res.json({ destinations });
});

app.get('/api/destinations/:id', async (req, res) => {
  const destination = await get('SELECT id, name, location, imageUrl, description, lowestPrice FROM destinations WHERE id = ?', [req.params.id]);
  if (!destination) {
    return res.status(404).json({ error: 'Destination not found' });
  }
  const itineraries = await all('SELECT id, destinationId, title, summary FROM itineraries WHERE destinationId = ?', [destination.id]);
  return res.json({ destination, itineraries });
});

app.get('/api/hotels', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  const hotels = await all(
    'SELECT id, name, location, price, imageUrl, details FROM hotels WHERE name LIKE ? OR location LIKE ? ORDER BY price',
    [search, search]
  );
  return res.json({ hotels });
});

app.get('/api/itineraries', async (req, res) => {
  const destinationId = req.query.destinationId;
  let itineraries;
  if (destinationId) {
    itineraries = await all('SELECT id, destinationId, title, summary FROM itineraries WHERE destinationId = ?', [destinationId]);
  } else {
    itineraries = await all('SELECT id, destinationId, title, summary FROM itineraries ORDER BY id');
  }
  return res.json({ itineraries });
});

app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const user = await get('SELECT id, username, email, bio, location FROM users WHERE id = ?', [req.userId]);
    const trips = await all('SELECT id FROM trips WHERE userId = ?', [req.userId]);
    return res.json({ user, stats: { trips: trips.length } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load profile' });
  }
});

const port = process.env.PORT || 4000;
init().then(() => {
  app.listen(port, () => {
    console.log(`WanderWise backend listening on http://localhost:${port}`);
  });
});
