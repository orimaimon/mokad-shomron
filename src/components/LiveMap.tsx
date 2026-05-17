import { useEffect, useRef, useCallback } from 'react';
import { DBIncident, RosterMember, ActiveEvent } from '../types';
import { parseMapCoords } from '../lib/utils';

// Declare L as any since we load via CDN
declare const L: any;

interface LiveMapProps {
  incidents: DBIncident[];
  roster?: RosterMember[];
  activeEvent?: ActiveEvent | null;
}

// ── KML Parser ────────────────────────────────────────────────────────────
// Parses KML XML and returns Leaflet layers (markers, polylines, polygons)

function parseKmlToLayers(kmlText: string, L: any): any[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');
  const layers: any[] = [];

  // Helper: parse <coordinates> text → [lat,lng] array
  const parseCoords = (text: string): [number, number][] => {
    return text.trim().split(/\s+/).map(c => {
      const [lng, lat] = c.split(',').map(Number);
      return [lat, lng] as [number, number];
    }).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
  };

  // Helper: get hex color from KML color (aabbggrr → #rrggbb)
  const kmlColorToHex = (kmlColor: string): string => {
    if (!kmlColor || kmlColor.length < 8) return '#3b82f6';
    const r = kmlColor.substring(6, 8);
    const g = kmlColor.substring(4, 6);
    const b = kmlColor.substring(2, 4);
    return `#${r}${g}${b}`;
  };

  // Collect styles
  const styles: Record<string, { color: string; width: number; fillColor: string; iconUrl?: string }> = {};
  doc.querySelectorAll('Style').forEach((style: Element) => {
    const id = style.getAttribute('id') || '';
    const lineColor = style.querySelector('LineStyle > color')?.textContent || '';
    const lineWidth = parseFloat(style.querySelector('LineStyle > width')?.textContent || '2');
    const polyColor = style.querySelector('PolyStyle > color')?.textContent || '';
    const iconHref = style.querySelector('IconStyle > Icon > href')?.textContent || '';
    styles[`#${id}`] = {
      color: kmlColorToHex(lineColor) || '#3b82f6',
      width: lineWidth || 2,
      fillColor: kmlColorToHex(polyColor) || '#3b82f6',
      iconUrl: iconHref || undefined,
    };
  });

  // Process Placemarks
  doc.querySelectorAll('Placemark').forEach((pm: Element) => {
    const name = pm.querySelector('name')?.textContent || '';
    const desc = pm.querySelector('description')?.textContent || '';
    const styleUrl = pm.querySelector('styleUrl')?.textContent || '';
    const style = styles[styleUrl] || { color: '#3b82f6', width: 2, fillColor: '#3b82f6' };

    // Point
    const point = pm.querySelector('Point > coordinates');
    if (point) {
      const coords = parseCoords(point.textContent || '');
      if (coords.length > 0) {
        const [lat, lng] = coords[0];
        const icon = L.divIcon({
          className: 'kml-marker',
          html: `<div style="
            width: 10px; height: 10px; 
            background: ${style.color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([lat, lng], { icon });
        if (name || desc) {
          marker.bindPopup(`
            <div style="font-family:inherit;direction:rtl;text-align:right;min-width:100px;">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${name}</div>
              ${desc ? `<div style="color:#666;font-size:11px;">${desc}</div>` : ''}
            </div>
          `);
        }
        layers.push(marker);
      }
    }

    // LineString
    const line = pm.querySelector('LineString > coordinates');
    if (line) {
      const coords = parseCoords(line.textContent || '');
      if (coords.length > 1) {
        const polyline = L.polyline(coords, {
          color: style.color,
          weight: style.width,
          opacity: 0.8,
        });
        if (name) polyline.bindPopup(`<div style="direction:rtl;font-weight:600;">${name}</div>`);
        layers.push(polyline);
      }
    }

    // Polygon
    const outerBoundary = pm.querySelector('Polygon > outerBoundaryIs > LinearRing > coordinates');
    if (outerBoundary) {
      const coords = parseCoords(outerBoundary.textContent || '');
      if (coords.length > 2) {
        const polygon = L.polygon(coords, {
          color: style.color,
          weight: style.width,
          fillColor: style.fillColor,
          fillOpacity: 0.15,
          opacity: 0.7,
        });
        if (name) polygon.bindPopup(`<div style="direction:rtl;font-weight:600;">${name}</div>`);
        layers.push(polygon);
      }
    }
  });

  return layers;
}

// ── LiveMap Component ─────────────────────────────────────────────────────

export function LiveMap({ incidents, roster, activeEvent }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const rosterLayer = useRef<any>(null);
  const emergencyLayer = useRef<any>(null);
  const kmlLayer = useRef<any>(null);
  const kmlLoaded = useRef(false);

  // Load KML data from Google My Maps (via our proxy)
  const loadKml = useCallback(async (map: any) => {
    if (kmlLoaded.current) return;
    kmlLoaded.current = true;

    try {
      const res = await fetch('/api/map/kml');
      if (!res.ok) throw new Error('KML fetch failed');
      const kmlText = await res.text();
      const layers = parseKmlToLayers(kmlText, L);

      if (kmlLayer.current) {
        kmlLayer.current.clearLayers();
      } else {
        kmlLayer.current = L.layerGroup().addTo(map);
      }

      layers.forEach((layer: any) => kmlLayer.current.addLayer(layer));
    } catch (e) {
      console.warn('[LiveMap] Failed to load KML:', e);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([32.18, 35.28], 12);

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control position
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Create layer groups
      kmlLayer.current = L.layerGroup().addTo(map);
      markersLayer.current = L.layerGroup().addTo(map);
      rosterLayer.current = L.layerGroup().addTo(map);
      emergencyLayer.current = L.layerGroup().addTo(map);

      mapInstance.current = map;

      // Load KML overlay
      loadKml(map);
    }
  }, [loadKml]);

  // Update incident markers
  useEffect(() => {
    if (!markersLayer.current || !mapInstance.current) return;
    markersLayer.current.clearLayers();

    incidents.forEach(inc => {
      if (inc.status === 'הסתיים') return;
      const coordsStr = parseMapCoords(inc.map_coords || '');
      if (!coordsStr) return;

      const [latStr, lngStr] = coordsStr.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) return;

      const sev = inc.severity || (inc as any).sev || 'green';
      const color = sev === 'red' ? '#ef4444' : sev === 'amber' ? '#f59e0b' : '#10b981';

      const icon = L.divIcon({
        className: 'cop-incident-marker',
        html: `
          <div style="position:relative;">
            <div style="
              width: 16px; height: 16px;
              background: ${color};
              border: 2px solid #fff;
              border-radius: 50%;
              box-shadow: 0 0 0 3px ${color}40, 0 2px 8px rgba(0,0,0,0.4);
              animation: copPulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute; top: -24px; left: 50%; transform: translateX(-50%);
              background: rgba(0,0,0,0.85); color: #fff; font-size: 10px;
              padding: 2px 6px; border-radius: 4px; white-space: nowrap;
              font-family: 'Rubik', sans-serif; font-weight: 500;
              border: 1px solid ${color}60;
            ">${inc.type}</div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(`
        <div style="font-family:'Rubik',sans-serif;direction:rtl;text-align:right;min-width:140px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:${color};">${inc.type}</div>
          <div style="color:#aaa;font-size:12px;margin-bottom:2px;">${inc.location}</div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;">
            <span>${inc.status}</span>
            <span>${new Date(inc.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });
  }, [incidents]);

  // Update roster markers (blue dots for personnel)
  useEffect(() => {
    if (!rosterLayer.current || !mapInstance.current) return;
    rosterLayer.current.clearLayers();

    if (!roster) return;

    roster.forEach(person => {
      if (person.isOutOfSector || person.is_out_of_sector) return;
      if (!person.map_coords) return;

      const coordsStr = parseMapCoords(person.map_coords);
      if (!coordsStr) return;

      const [latStr, lngStr] = coordsStr.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) return;

      const stateColor = person.state === 'field' ? '#3b82f6' : person.state === 'brief' ? '#f59e0b' : '#6b7280';

      const icon = L.divIcon({
        className: 'cop-roster-marker',
        html: `
          <div style="position:relative;">
            <div style="
              width: 12px; height: 12px;
              background: ${stateColor};
              border: 2px solid #fff;
              border-radius: 3px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.5);
              transform: rotate(45deg);
            "></div>
            <div style="
              position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
              background: rgba(0,0,0,0.8); color: #fff; font-size: 9px;
              padding: 1px 5px; border-radius: 3px; white-space: nowrap;
              font-family: 'Rubik', sans-serif;
            ">${person.name}</div>
          </div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(`
        <div style="font-family:'Rubik',sans-serif;direction:rtl;text-align:right;">
          <div style="font-weight:700;font-size:13px;color:#3b82f6;">${person.name}</div>
          <div style="font-size:11px;color:#aaa;">${person.role} • ${person.task || ''}</div>
          ${person.phone ? `<div style="font-size:11px;color:#888;margin-top:3px;">📞 ${person.phone}</div>` : ''}
        </div>
      `);
      rosterLayer.current.addLayer(marker);
    });
  }, [roster]);

  // Update emergency event layer (big red marker + danger radius)
  useEffect(() => {
    if (!emergencyLayer.current || !mapInstance.current) return;
    emergencyLayer.current.clearLayers();

    if (!activeEvent || !activeEvent.map_coords) return;

    const coordsStr = parseMapCoords(activeEvent.map_coords);
    if (!coordsStr) return;

    const [latStr, lngStr] = coordsStr.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return;

    // Danger radius circle (1km)
    const circle = L.circle([lat, lng], {
      radius: 1000,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '8 4',
      className: 'cop-danger-zone',
    });
    emergencyLayer.current.addLayer(circle);

    // Inner zone (250m)
    const innerCircle = L.circle([lat, lng], {
      radius: 250,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.15,
      weight: 1.5,
    });
    emergencyLayer.current.addLayer(innerCircle);

    // Emergency marker
    const icon = L.divIcon({
      className: 'cop-emergency-marker',
      html: `
        <div style="position:relative;">
          <div style="
            width: 24px; height: 24px;
            background: #ef4444;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 0 6px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.4);
            animation: copEmergencyPulse 1.5s ease-in-out infinite;
          "></div>
          <div style="
            position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
            background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
            padding: 3px 10px; border-radius: 6px; white-space: nowrap;
            font-family: 'Rubik', sans-serif;
            box-shadow: 0 2px 8px rgba(239,68,68,0.5);
          ">🚨 ${activeEvent.type}</div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
    marker.bindPopup(`
      <div style="font-family:'Rubik',sans-serif;direction:rtl;text-align:right;min-width:180px;">
        <div style="font-weight:700;font-size:15px;color:#ef4444;margin-bottom:6px;">🚨 ${activeEvent.type}</div>
        <div style="font-size:12px;color:#ccc;margin-bottom:3px;">📍 ${activeEvent.location}</div>
        ${activeEvent.description ? `<div style="font-size:11px;color:#aaa;margin-bottom:4px;">${activeEvent.description}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;font-size:11px;color:#aaa;">
          <span>הרוגים: <b style="color:#ef4444">${activeEvent.dead || 0}</b></span>
          <span>קשה: <b style="color:#f59e0b">${activeEvent.critical || 0}</b></span>
          <span>בינוני: <b style="color:#f59e0b">${activeEvent.serious || 0}</b></span>
          <span>קל: <b style="color:#10b981">${activeEvent.light || 0}</b></span>
        </div>
      </div>
    `);
    emergencyLayer.current.addLayer(marker);

    // Auto-zoom to emergency area
    mapInstance.current.flyTo([lat, lng], 14, { duration: 1.5 });
  }, [activeEvent]);

  return (
    <>
      <style>{`
        @keyframes copPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(59,130,246,0.1), 0 2px 8px rgba(0,0,0,0.4); }
        }
        @keyframes copEmergencyPulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0.1), 0 0 30px rgba(239,68,68,0.3); transform: scale(1.05); }
        }
        .cop-danger-zone { animation: copDangerPulse 3s ease-in-out infinite; }
        .leaflet-popup-content-wrapper { background: #1a1d24 !important; color: #e0e0e0 !important; border-radius: 10px !important; border: 1px solid rgba(255,255,255,0.1) !important; }
        .leaflet-popup-tip { background: #1a1d24 !important; }
        .leaflet-popup-close-button { color: #888 !important; }
      `}</style>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0d14',
          zIndex: 1,
        }}
      />
    </>
  );
}
