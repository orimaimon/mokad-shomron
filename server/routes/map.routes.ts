import { Router } from 'express';
import https from 'https';
import type { ServerResponse } from 'http';

const router = Router();

const MAX_REDIRECTS = 5;

function fetchWithRedirects(url: string, res: ServerResponse, remaining: number): void {
  if (remaining === 0) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Too many redirects fetching KML' }));
    return;
  }
  https.get(url, (upstream) => {
    if (upstream.statusCode && upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
      upstream.resume(); // drain and discard redirect body
      fetchWithRedirects(upstream.headers.location, res, remaining - 1);
      return;
    }
    (res as any).setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    upstream.pipe(res);
  }).on('error', (e) => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch KML', details: e.message }));
  });
}

router.get('/kml', (req, res) => {
  const kmlUrl = 'https://www.google.com/maps/d/kml?mid=16VL3nmAMv2aha47jz_jdtykSXq-Mx74&forcekml=1';
  fetchWithRedirects(kmlUrl, res as any, MAX_REDIRECTS);
});

export default router;
