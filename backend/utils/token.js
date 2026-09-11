const crypto = require('crypto');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'wanderwise-dev-secret';

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

function createToken(payload) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('hex');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('hex');

  try {
    if (signature.length !== expectedSignature.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return null;
    }
  } catch (error) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

module.exports = { createToken, verifyToken };
