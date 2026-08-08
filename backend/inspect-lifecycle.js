const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('./server');

(async () => {
  const tempDbPath = path.join(__dirname, 'tmp-profile-db.json');
  fs.rmSync(tempDbPath, { force: true });
  const server = createServer({ dbPath: tempDbPath, jwtSecret: 'test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const registerResponse = await fetch(base + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Grace Hopper', email: 'grace@example.com', password: 'secret123' })
  });
  const registerBody = await registerResponse.json();
  const token = registerBody.token;

  const profileResponse = await fetch(base + '/api/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Grace Murray Hopper' })
  });
  console.log('profile', profileResponse.status, await profileResponse.text());

  const createTripResponse = await fetch(base + '/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Tokyo', destination: 'Japan', startDate: '2026-10-10', endDate: '2026-10-18' })
  });
  const createdTrip = await createTripResponse.json();
  console.log('create', createTripResponse.status, JSON.stringify(createdTrip));

  const updateTripResponse = await fetch(base + '/api/trips/' + createdTrip.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Tokyo Adventure' })
  });
  console.log('update', updateTripResponse.status, await updateTripResponse.text());

  const deleteTripResponse = await fetch(base + '/api/trips/' + createdTrip.id, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('delete', deleteTripResponse.status, await deleteTripResponse.text());

  const listResponse = await fetch(base + '/api/trips', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('list', listResponse.status, await listResponse.text());

  server.close();
})();
