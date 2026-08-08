const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('../server');

test('register and login create a user account', async () => {
  const tempDbPath = path.join(__dirname, 'tmp-auth-db.json');
  fs.rmSync(tempDbPath, { force: true });

  const server = createServer({ dbPath: tempDbPath, jwtSecret: 'test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const registerResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'securepass123'
    })
  });

  const registerBody = await registerResponse.json();
  assert.equal(registerResponse.status, 201);
  assert.equal(registerBody.user.email, 'ada@example.com');
  assert.ok(registerBody.token);

  const loginResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'securepass123' })
  });

  const loginBody = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(loginBody.user.email, 'ada@example.com');

  server.close();
  await once(server, 'close');
  fs.rmSync(tempDbPath, { force: true });
});

test('supports profile updates and trip lifecycle actions', async () => {
  const tempDbPath = path.join(__dirname, 'tmp-profile-db.json');
  fs.rmSync(tempDbPath, { force: true });

  const server = createServer({ dbPath: tempDbPath, jwtSecret: 'test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const registerResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Grace Hopper', email: 'grace@example.com', password: 'secret123' })
  });
  const registerBody = await registerResponse.json();
  const token = registerBody.token;

  const profileResponse = await fetch(`http://127.0.0.1:${address.port}/api/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Grace Murray Hopper' })
  });

  const profileBody = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profileBody.user.name, 'Grace Murray Hopper');

  const createTripResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Tokyo', destination: 'Japan', startDate: '2026-10-10', endDate: '2026-10-18' })
  });

  const createdTrip = await createTripResponse.json();
  assert.equal(createTripResponse.status, 201);
  assert.equal(createdTrip.destination, 'Japan');

  const updateTripResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips/${createdTrip.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Tokyo Adventure' })
  });

  const updatedTrip = await updateTripResponse.json();
  assert.equal(updateTripResponse.status, 200);
  assert.equal(updatedTrip.title, 'Tokyo Adventure');

  const deleteTripResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips/${createdTrip.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  const deleteBody = await deleteTripResponse.json();
  assert.equal(deleteTripResponse.status, 200);
  assert.equal(deleteBody.deleted, true);

  const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/trips`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(list.length, 0);

  server.close();
  await once(server, 'close');
  fs.rmSync(tempDbPath, { force: true });
});
