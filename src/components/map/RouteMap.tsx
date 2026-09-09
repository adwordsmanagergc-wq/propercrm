'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet';
import type { JobStatus } from '@/lib/types/database';
import 'leaflet/dist/leaflet.css';

/**
 * The least a pin needs. Kept deliberately neutral so the office map and the
 * cleaner's map share this component — the cleaner's data has no price on it,
 * and nothing here can reintroduce one.
 */
export interface MapPin {
  id: string;
  lat: number | null;
  lng: number | null;
  status: JobStatus;
  title: string;
  subtitle: string;
}

const STATUS_COLOUR: Record<JobStatus, string> = {
  scheduled: 'var(--blue-500)',
  in_progress: 'var(--warning)',
  completed: 'var(--success)',
  skipped: 'var(--danger)',
  cancelled: 'var(--grey-500)',
};

/**
 * The day plotted out: numbered pins in route order, coloured by status, with
 * the run between them drawn in. Leaflet is loaded on demand rather than
 * bundled, and uses OpenStreetMap tiles so there is no map key to manage.
 */
export function RouteMap({
  pins,
  start,
  onSelect,
  selectedId,
  className = 'h-[28rem] w-full rounded-card border border-grey-200 bg-blue-50 lg:h-[36rem]',
}: {
  pins: MapPin[];
  start: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  selectedId?: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<(Marker | Polyline)[]>([]);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];

      const located = pins.filter(
        (pin): pin is MapPin & { lat: number; lng: number } =>
          typeof pin.lat === 'number' && typeof pin.lng === 'number',
      );

      located.forEach((pin, index) => {
        const selected = pin.id === selectedId;
        const size = selected ? 40 : 30;
        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:999px;background:${
              STATUS_COLOUR[pin.status] ?? 'var(--blue-500)'
            };color:#fff;font:600 ${selected ? 17 : 13}px/1 Inter,system-ui,sans-serif;box-shadow:0 2px 8px rgba(8,53,95,.35);border:${selected ? 3 : 2}px solid #fff">${index + 1}</span>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          title: `${pin.title} — ${pin.subtitle}`,
          zIndexOffset: selected ? 1000 : 0,
        })
          .addTo(map)
          .on('click', () => selectRef.current(pin.id));
        layersRef.current.push(marker);
      });

      if (start) {
        const yard = L.marker([start.lat, start.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:6px;background:var(--grey-900);color:#fff;font:600 11px/1 Inter,system-ui,sans-serif;border:2px solid #fff">Y</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
          title: 'The yard',
        }).addTo(map);
        layersRef.current.push(yard);
      }

      const path: [number, number][] = [
        ...(start ? ([[start.lat, start.lng]] as [number, number][]) : []),
        ...located.map((pin) => [pin.lat, pin.lng] as [number, number]),
      ];

      if (path.length > 1) {
        const line = L.polyline(path, {
          color: 'var(--blue-400)',
          weight: 3,
          opacity: 0.8,
          dashArray: '6 6',
        }).addTo(map);
        layersRef.current.push(line);
      }

      if (path.length > 0) {
        map.fitBounds(L.latLngBounds(path), { padding: [32, 32], maxZoom: 15 });
      } else {
        map.setView([51.4485, -0.9735], 12);
      }
    }

    void draw();
    return () => {
      cancelled = true;
    };
  }, [pins, start, selectedId]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map of the day's jobs"
      className={className}
    />
  );
}
