/**
 * One-shot sync, designed for a trusted scheduled worker. Not browser code.
 * Run from cloud/firebase-mirror with Node 20+ after configuring:
 *   DATABASE_URL (private, server only)
 *   FIREBASE_PROJECT_ID
 *   Application Default Credentials (Google Cloud IAM or server-side key)
 * No service-account JSON, Postgres passwords, or privileged keys in Git.
 */
import pg from 'pg';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mirrorNextOutboxEvent } from './mirror-core.mjs';

if (!process.env.DATABASE_URL || !process.env.FIREBASE_PROJECT_ID) {
  throw new Error('Missing DATABASE_URL or FIREBASE_PROJECT_ID.');
}
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10000
});
try {
  const firestore = getFirestore();
  const maxEvents = 100;
  let processed = 0;
  for (let i = 0; i < maxEvents; i++) {
    const result = await mirrorNextOutboxEvent({ pool, firestore });
    if (result.status === 'empty') break;
    processed++;
  }
  console.log('Firestore mirror run finished; handled events:', processed);
} finally {
  await pool.end();
}
