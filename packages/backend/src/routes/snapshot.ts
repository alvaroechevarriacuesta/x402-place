import { Hono } from 'hono';
import type { Context } from 'hono';
import { getLatestSnapshot } from '@x402place/shared/lib/canvas';

export function registerSnapshotRoutes(app: Hono) {
  // TODO enable CORS on this endpoint
  app.get('/api/snapshot', async (c: Context) => {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) {
      return c.json({ error: 'No snapshot found' }, 404);
    }
    return c.json(snapshot);
  });
}
