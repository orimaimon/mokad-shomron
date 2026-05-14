import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

declare const L: any;

interface MapPickerProps {
  initialCoords?: string; // "lat,lng"
  onSelect: (coords: string) => void;
  onClose: () => void;
}

export function MapPicker({ initialCoords, onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(() => {
    if (initialCoords) {
      const [latStr, lngStr] = initialCoords.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  });

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const initialCenter = selectedCoords || [32.18, 35.2];
      const map = L.map(mapRef.current).setView(initialCenter, 11);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (selectedCoords) {
        markerInstance.current = L.marker(selectedCoords).addTo(map);
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setSelectedCoords([lat, lng]);
        
        if (markerInstance.current) {
          markerInstance.current.setLatLng([lat, lng]);
        } else {
          markerInstance.current = L.marker([lat, lng]).addTo(map);
        }
      });

      mapInstance.current = map;
    }
  }, []);

  const handleConfirm = () => {
    if (selectedCoords) {
      onSelect(`${selectedCoords[0].toFixed(6)}, ${selectedCoords[1].toFixed(6)}`);
    } else {
      onClose(); // Just close if nothing selected
    }
  };

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 800, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="h">
          <Icon name="Map" />
          <h3>בחירת מיקום מהמפה</h3>
        </div>
        <div className="b" style={{ flex: 1, padding: 0, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
        </div>
        <div className="f">
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
            {selectedCoords ? `נ"צ נבחר: ${selectedCoords[0].toFixed(5)}, ${selectedCoords[1].toFixed(5)}` : 'לחץ על המפה כדי לבחור מיקום'}
          </div>
          <button className="btn brand" onClick={handleConfirm} disabled={!selectedCoords}>
            <Icon name="Check" style={{ width: 14 }} /> אישור
          </button>
          <button className="btn ghost" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}
