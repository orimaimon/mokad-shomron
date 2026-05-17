import { Router } from 'express';
import https from 'https';

const router = Router();

router.get('/kml', (req, res) => {
  const kmlUrl = 'https://www.google.com/maps/d/kml?mid=16VL3nmAMv2aha47jz_jdtykSXq-Mx74&forcekml=1';

  https.get(kmlUrl, (googleRes) => {
    // Handle redirects (Google sometimes redirects to another server for KML)
    if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
      https.get(googleRes.headers.location, (redirectRes) => {
        res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
        redirectRes.pipe(res);
      }).on('error', (e) => {
        res.status(500).json({ error: 'Failed to follow redirect for KML', details: e.message });
      });
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    googleRes.pipe(res);
  }).on('error', (e) => {
    res.status(500).json({ error: 'Failed to fetch KML', details: e.message });
  });
});

export default router;
