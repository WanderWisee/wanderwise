const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('../server');

test('serves the built web app and supports the legacy register endpoint', async () => {
  const tempDbPath = path.join(__dirname, 'tmp-frontend-db.json');
  fs.rmSync(tempDbPath, { force: true });

  const server = createServer({ dbPath: tempDbPath, jwtSecret: 'test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const appResponse = await fetch(baseUrl + '/');
  const appHtml = await appResponse.text();
  assert.equal(appResponse.status, 200);
  assert.match(appHtml, /<div id="root"><\/div>/);

  const registerResponse = await fetch(baseUrl + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Frontend User', email: 'frontend@example.com', password: 'frontendpass123' })
  });
  const registerBody = await registerResponse.json();

  assert.equal(registerResponse.status, 201);
  assert.equal(registerBody.user.email, 'frontend@example.com');

  server.close();
  await once(server, 'close');
  fs.rmSync(tempDbPath, { force: true });
});
