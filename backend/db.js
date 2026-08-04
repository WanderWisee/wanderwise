const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'wanderwise.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Unable to open database', err);
    process.exit(1);
  }
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    bio TEXT,
    location TEXT,
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    travelDate TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    description TEXT NOT NULL,
    lowestPrice TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS hotels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    price TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    details TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS itineraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destinationId INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    FOREIGN KEY(destinationId) REFERENCES destinations(id)
  )`);

  const destinationCount = await get('SELECT COUNT(1) AS count FROM destinations');
  if (destinationCount.count === 0) {
    const destinations = [
      {
        name: 'Tokyo, Japan',
        location: 'Shinjuku & Shibuya',
        imageUrl: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?auto=format&fit=crop&w=900&q=80',
        description: 'A bright, busy city with food, fashion, and temples.',
        lowestPrice: 'USD 899',
      },
      {
        name: 'Bali, Indonesia',
        location: 'Ubud & Seminyak',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
        description: 'Tropical beaches, rice terraces, and spiritual wellness retreats.',
        lowestPrice: 'USD 599',
      },
      {
        name: 'Paris, France',
        location: 'Eiffel Tower District',
        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
        description: 'Iconic art, cafes, and river walks along the Seine.',
        lowestPrice: 'USD 950',
      },
      {
        name: 'Singapore Guide',
        location: 'Marina Bay & Sentosa',
        imageUrl: 'https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=900&q=80',
        description: 'City gardens, night markets, and world-class attractions.',
        lowestPrice: 'USD 680',
      },
    ];

    for (const dest of destinations) {
      await run(
        'INSERT INTO destinations (name, location, imageUrl, description, lowestPrice) VALUES (?, ?, ?, ?, ?)',
        [dest.name, dest.location, dest.imageUrl, dest.description, dest.lowestPrice]
      );
    }
  }

  const hotelCount = await get('SELECT COUNT(1) AS count FROM hotels');
  if (hotelCount.count === 0) {
    const hotels = [
      {
        name: 'Hidden Palms Inn/Resort',
        location: 'La Union, PH',
        price: '₱2,900',
        imageUrl: 'https://images.unsplash.com/photo-1501117716987-c8e7f5c3f8a8?auto=format&fit=crop&w=900&q=80',
        details: 'Free Wi-Fi · Free Breakfast · Free Parking · Outdoor Pool · Air Conditioning',
      },
      {
        name: 'Oceanfront Sunset Hotel',
        location: 'San Juan, PH',
        price: '₱3,450',
        imageUrl: 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?auto=format&fit=crop&w=900&q=80',
        details: 'Beach view · Pool access · Breakfast included · Spa services',
      },
      {
        name: 'City Gateway Suites',
        location: 'Makati, PH',
        price: '₱4,200',
        imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
        details: 'Free breakfast · Gym · Airport shuttle · Rooftop lounge',
      },
    ];

    for (const hotel of hotels) {
      await run(
        'INSERT INTO hotels (name, location, price, imageUrl, details) VALUES (?, ?, ?, ?, ?)',
        [hotel.name, hotel.location, hotel.price, hotel.imageUrl, hotel.details]
      );
    }
  }

  const itineraryCount = await get('SELECT COUNT(1) AS count FROM itineraries');
  if (itineraryCount.count === 0) {
    const destinations = await all('SELECT id, name FROM destinations');
    const itineraries = [
      {
        destinationName: 'Tokyo, Japan',
        title: 'Shibuya After Dark',
        summary: 'Experience neon streets, sushi stalls, and the famous Shibuya crossing.',
      },
      {
        destinationName: 'Bali, Indonesia',
        title: 'Sunrise at Mount Batur',
        summary: 'Hike before dawn and enjoy the view from the volcanic summit.',
      },
      {
        destinationName: 'Paris, France',
        title: 'Louvre & Seine Stroll',
        summary: 'See world-class art, then relax beside the river at sunset.',
      },
      {
        destinationName: 'Singapore Guide',
        title: 'Gardens by the Bay',
        summary: 'Explore futuristic parks, light shows, and waterfront dining.',
      },
    ];

    for (const itinerary of itineraries) {
      const destination = destinations.find((dest) => dest.name.includes(itinerary.destinationName.split(',')[0]));
      if (destination) {
        await run(
          'INSERT INTO itineraries (destinationId, title, summary) VALUES (?, ?, ?)',
          [destination.id, itinerary.title, itinerary.summary]
        );
      }
    }
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  init,
};
