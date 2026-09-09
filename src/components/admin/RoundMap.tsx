'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet';
import type { JobView } from '@/lib/db/views';

const STATUS_COLOUR: Record<string, string> = {
  scheduled: 'var(--blue-500)',
  in_progress: 'var(--warning)',
  completed: 'var(--success)',
  skipped: 'var(--danger)',
  cancelled: 'var(--grey-500)',
};

/**
 * The day plotted out. Leaflet is loaded on demand rather than bundled, and
 * uses OpenStreetMap tiles so there is no map key to manage.
 */
export function RoundMap({
  jobs,
  start,
  onSelect,
}: {
  jobs: JobView[];
  start: { lat: number; lng: number } | null;
  onSelect: (jobId: string) => void;
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

      const located = jobs.filter(
        (job): job is JobView & { lat: number; lng: number } =>
          typeof job.lat === 'number' && typeof job.lng === 'number',
      );

      located.forEach((job, index) => {
        const marker = L.marker([job.lat, job.lng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:${
              STATUS_COLOUR[job.status] ?? 'var(--blue-500)'
            };color:#fff;font:600 13px/1 Inter,system-ui,sans-serif;box-shadow:0 2px 8px rgba(8,53,95,.35);border:2px solid #fff">${index + 1}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
          title: `${job.customerName} — ${job.addressLine1}`,
        })
          .addTo(map)
          .on('click', () => selectRef.current(job.id));
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
        ...located.map((job) => [job.lat, job.lng] as [number, number]),
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
  }, [jobs, start]);

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
      className="h-[28rem] w-full rounded-card border border-grey-200 bg-blue-50 lg:h-[36rem]"
    />
  );
}
