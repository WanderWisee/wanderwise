const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('./server');

(async () => {
  const tempDbPath = path.join(__dirname, 'tmp-auth-debug.json');
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
  console.log('token', token);

  const meResponse = await fetch(base + '/api/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('me', meResponse.status, await meResponse.text());

  server.close();
})();
