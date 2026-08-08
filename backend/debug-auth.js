const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('./server');

(async () => {
  const tempDbPath = path.join(__dirname, 'tmp-debug2-db.json');
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
  console.log('register', registerBody);

  const token = registerBody.token;
  const createTripResponse = await fetch(base + '/api/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Tokyo', destination: 'Japan', startDate: '2026-10-10', endDate: '2026-10-18' })
  });
  console.log('create', createTripResponse.status, await createTripResponse.text());

  const listResponse = await fetch(base + '/api/trips', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('list', listResponse.status, await listResponse.text());

  server.close();
})();
