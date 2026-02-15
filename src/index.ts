import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`SDLC Maturity Tracker listening on port ${env.PORT}`);
  console.log(`  → App:    http://localhost:${env.PORT}`);
  console.log(`  → Health: http://localhost:${env.PORT}/health`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Stop the other process or set PORT in .env`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
