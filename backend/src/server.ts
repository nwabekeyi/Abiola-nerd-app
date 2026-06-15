import { createApp } from './app/app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedAdmin } from './controllers/authController.js';
import { recomputeAnalytics } from './services/analytics.js';

async function bootstrap() {
  await connectDb();
  await seedAdmin();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`NERD registration API listening on port ${env.port}`);
  });

  server.on('listening', async () => {
    await recomputeAnalytics();
    scheduleNext();
  });

  function scheduleNext() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const delay = tomorrow.getTime() - now.getTime();
    setTimeout(async () => {
      await recomputeAnalytics();
      scheduleNext();
    }, delay);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
