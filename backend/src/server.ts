import { createApp } from './app/app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedAdmin } from './controllers/authController.js';

async function bootstrap() {
  await connectDb();
  await seedAdmin();

  createApp().listen(env.port, () => {
    console.log(`NERD registration API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
