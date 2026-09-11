const mysql = require('mysql2/promise');
require('dotenv').config();

// A "pool" keeps several MySQL connections open and ready to reuse,
// instead of opening/closing a connection for every single query.
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wanderwise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
