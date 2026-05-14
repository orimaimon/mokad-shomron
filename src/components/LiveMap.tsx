import { useEffect, useRef } from 'react';
import { DBIncident } from '../types';
import { parseMapCoords } from '../lib/utils';

// Declare L as any since we load via CDN
declare const L: any;

interface LiveMapProps {
  incidents: DBIncident[];
}

export function LiveMap({ incidents }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    if (!mapInstance.current) {
      const map = L.map(mapRef.current).setView([32.18, 35.2], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Create a layer group for incident markers
      markersLayer.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    }

    // Update markers
    if (markersLayer.current && mapInstance.current) {
      markersLayer.current.clearLayers();

      incidents.forEach(inc => {
        if (inc.status === 'הסתיים') return;
        const coordsStr = parseMapCoords(inc.map_coords || '');
        if (!coordsStr) return;
        
        const [latStr, lngStr] = coordsStr.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) return;

        const sev = inc.severity || inc.sev || 'green';
        const color = sev === 'red' ? '#ef4444' : sev === 'amber' ? '#f59e0b' : '#10b981';

        // Create a custom CSS pulsing marker
        const icon = L.divIcon({
          className: 'custom-map-marker',
          html: `<div style="
            width: 14px; 
            height: 14px; 
            background: ${color}; 
            border-radius: 50%; 
            box-shadow: 0 0 0 4px ${color}40;
            animation: pulse 2s infinite;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([lat, lng], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; direction: rtl; text-align: right;">
            <div style="font-weight: 600; margin-bottom: 4px;">${inc.type}</div>
            <div style="color: #666; font-size: 12px;">${inc.location}</div>
          </div>
        `);
        markersLayer.current.addLayer(marker);
      });
    }
  }, [incidents]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#111', 
        filter: 'brightness(0.8) contrast(1.2) sepia(0.2) hue-rotate(180deg) invert(0.9)', 
        zIndex: 1 
      }} 
    />
  );
}
