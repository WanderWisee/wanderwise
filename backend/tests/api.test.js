const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('../server');

test('health endpoint responds successfully', async () => {
  const tempDbPath = path.join(__dirname, 'tmp-health-db.json');
  fs.rmSync(tempDbPath, { force: true });

  const server = createServer({ dbPath: tempDbPath });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');

  server.close();
  await once(server, 'close');
  fs.rmSync(tempDbPath, { force: true });
});

test('can create and list trips', async () => {
  const tempDbPath = path.join(__dirname, 'tmp-trips-db.json');
  fs.rmSync(tempDbPath, { force: true });

  const server = createServer({ dbPath: tempDbPath, jwtSecret: 'test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const registerResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Travel User', email: 'travel@example.com', password: 'travelpass123' })
  });
  const registerBody = await registerResponse.json();
  const token = registerBody.token;

  const createResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Island Escape',
      destination: 'Bohol',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      notes: 'Beach and caves'
    })
  });

  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(created.title, 'Island Escape');

  const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(list.length, 1);
  assert.equal(list[0].destination, 'Bohol');

  server.close();
  await once(server, 'close');
  fs.rmSync(tempDbPath, { force: true });
});
