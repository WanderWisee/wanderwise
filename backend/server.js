require("dotenv").config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MongoClient } = require('mongodb');

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4;
  const normalized = padding === 0 ? padded : padded + '='.repeat(4 - padding);
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function createToken(payload, secret) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('hex');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('hex');

  try {
    if (signature.length !== expectedSignature.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return null;
    }
  } catch (error) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body));
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...rest } = user;
  return rest;
}

function createServer(options = {}) {
  const dbPath = options.dbPath || path.join(__dirname, 'data', 'wanderwise.json');
  const dataDir = path.dirname(dbPath);
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'wanderwise-dev-secret';
  const mongoUri = options.mongoUri || process.env.MONGODB_URI || '';
  const mongoDbName = options.mongoDbName || process.env.MONGODB_DB || 'wanderwise';

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let storePromise = initializeStore();

  async function initializeStore() {
    if (!mongoUri) {
      return { mode: 'json' };
    }

    try {
      const client = await MongoClient.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      const db = client.db(mongoDbName);
      return { mode: 'mongo', client, db };
    } catch (error) {
      console.warn('MongoDB connection failed, falling back to JSON store.', error.message);
      return { mode: 'json' };
    }
  }

  async function readStore() {
    const store = await storePromise;

    if (store.mode === 'mongo') {
      const users = await store.db.collection('users').find({}).toArray();
      const trips = await store.db.collection('trips').find({}).toArray();
      return { users, trips };
    }

    if (!fs.existsSync(dbPath)) {
      return { users: [], trips: [] };
    }

    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        trips: Array.isArray(parsed.trips) ? parsed.trips : []
      };
    } catch (error) {
      return { users: [], trips: [] };
    }
  }

  async function writeStore(data) {
    const store = await storePromise;

    if (store.mode === 'mongo') {
      const usersCollection = store.db.collection('users');
      const tripsCollection = store.db.collection('trips');
      await usersCollection.deleteMany({});
      await tripsCollection.deleteMany({});
      if (data.users.length) {
        await usersCollection.insertMany(data.users);
      }
      if (data.trips.length) {
        await tripsCollection.insertMany(data.trips);
      }
      return;
    }

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  }

  async function findUserByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const data = await readStore();
    return data.users.find((user) => typeof user.email === 'string' && user.email === email);
  }

  // Find a user by either email or username (name). Identifier matching is case-insensitive for
  // both email and name. Prefer an exact email match first, then fall back to a name match.
  async function findUserByIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const data = await readStore();
    const normalized = identifier.toLowerCase();

    // Try email match first
    const byEmail = data.users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === normalized);
    if (byEmail) return byEmail;

    // Fallback to name (username) match
    const byName = data.users.find((u) => typeof u.name === 'string' && u.name.toLowerCase() === normalized);
    if (byName) return byName;

    return null;
  }

  async function createUser(userInput) {
    const data = await readStore();
    const normalizedEmail = userInput.email.toLowerCase();
    const existing = data.users.find((user) => user.email === normalizedEmail);

    if (existing) {
      return { error: 'User already exists' };
    }

    const user = {
      id: `usr_${Date.now()}`,
      name: userInput.name,
      email: normalizedEmail,
      password: hashPassword(userInput.password),
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    await writeStore(data);
    return { user };
  }

  async function createTrip(tripInput, user) {
    const data = await readStore();
    const createdTrip = {
      id: `trip_${Date.now()}`,
      ...tripInput,
      userId: user ? user.id : null,
      createdAt: new Date().toISOString()
    };

    data.trips.push(createdTrip);
    await writeStore(data);
    return createdTrip;
  }

  async function updateTrip(tripId, tripInput, user) {
    const data = await readStore();
    const index = data.trips.findIndex((trip) => trip.id === tripId && trip.userId === user.id);
    if (index === -1) {
      return null;
    }

    data.trips[index] = {
      ...data.trips[index],
      ...tripInput,
      updatedAt: new Date().toISOString()
    };
    await writeStore(data);
    return data.trips[index];
  }

  async function deleteTrip(tripId, user) {
    const data = await readStore();
    const index = data.trips.findIndex((trip) => trip.id === tripId && trip.userId === user.id);
    if (index === -1) {
      return false;
    }

    data.trips.splice(index, 1);
    await writeStore(data);
    return true;
  }

  async function updateUserProfile(userId, updates) {
    const data = await readStore();
    const index = data.users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return null;
    }

    const nextUser = {
      ...data.users[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
      nextUser.email = updates.email ? updates.email.toLowerCase() : data.users[index].email;
    }

    data.users[index] = nextUser;
    await writeStore(data);
    return nextUser;
  }

  async function readTrips(user) {
    const data = await readStore();
    if (!user) {
      return data.trips;
    }

    return data.trips.filter((trip) => trip.userId === user.id);
  }

  async function parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  async function authenticate(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token, jwtSecret);
    if (!payload || !payload.sub) {
      return null;
    }

    const user = await findUserByEmail(payload.email);
    if (!user) {
      return null;
    }

    if (user.id !== payload.sub) {
      const fallbackUser = await findUserByEmail(user.email);
      if (!fallbackUser || fallbackUser.id !== payload.sub) {
        return null;
      }
      return fallbackUser;
    }

    return user;
  }

  async function getAuthenticatedUser(req) {
    return authenticate(req);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/register')) {
      try {
        const body = await parseBody(req);
        if (!body.name || !body.email || !body.password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name, email, and password are required' }));
          return;
        }

        const result = await createUser(body);
        if (result.error) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: result.error }));
          return;
        }

        const token = createToken({ sub: result.user.id, email: result.user.email, name: result.user.name, exp: Date.now() + 1000 * 60 * 60 * 8 }, jwtSecret);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: sanitizeUser(result.user), token }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/auth/login' || url.pathname === '/api/login')) {
      try {
        const body = await parseBody(req);

        // Support logging in by email OR by username (name). Prefer the provided email field,
        // but also accept name or username. Matching is case-insensitive.
        let identifier = null;
        if (typeof body.email === 'string' && body.email) identifier = body.email;
        else if (typeof body.name === 'string' && body.name) identifier = body.name;
        else if (typeof body.username === 'string' && body.username) identifier = body.username;

        const user = await findUserByIdentifier(identifier);

        if (!user || !verifyPassword(body.password, user.password)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }

        const token = createToken({ sub: user.id, email: user.email, name: user.name, exp: Date.now() + 1000 * 60 * 60 * 8 }, jwtSecret);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: sanitizeUser(user), token }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = await authenticate(req);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: sanitizeUser(user) }));
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/me') {
      try {
        const user = await authenticate(req);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const body = await parseBody(req);
        const updates = {};
        if (typeof body.name === 'string') {
          updates.name = body.name;
        }
        if (typeof body.email === 'string') {
          updates.email = body.email.toLowerCase();
        }

        const updatedUser = await updateUserProfile(user.id, updates);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: sanitizeUser(updatedUser) }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/trips') {
      const user = await authenticate(req);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const trips = await readTrips(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trips));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/trips') {
      try {
        const user = await authenticate(req);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const body = await parseBody(req);
        const createdTrip = await createTrip(body, user);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createdTrip));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/api/trips/')) {
      try {
        const user = await authenticate(req);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const tripId = url.pathname.split('/').pop();
        const body = await parseBody(req);
        const trip = await updateTrip(tripId, body, user);
        if (!trip) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Trip not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(trip));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/trips/')) {
      try {
        const user = await authenticate(req);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const tripId = url.pathname.split('/').pop();
        const deleted = await deleteTrip(tripId, user);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ deleted }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      const indexPath = path.join(__dirname, '..', 'web', 'build', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(indexPath, 'utf8'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('WanderWise frontend build not found. Run the web app build first.');
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/static/')) {
      const filePath = path.join(__dirname, '..', 'web', 'build', url.pathname);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'application/javascript; charset=utf-8' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  const server = createServer();
  server.listen(port, () => {
    console.log(`WanderWise backend listening on port ${port}`);
  });
}

module.exports = { createServer };
