const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { createServer } = require('./server');
const crypto = require('node:crypto');

(async () => {
  const tempDbPath = path.join(__dirname, 'tmp-token-debug.json');
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
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  console.log('payload', payload);
  console.log('expected signature', crypto.createHmac('sha256', 'test-secret').update(`${parts[0]}.${parts[1]}`).digest('hex'));
  console.log('signature', parts[2]);
  server.close();
})();
