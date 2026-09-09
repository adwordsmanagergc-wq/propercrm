export interface Destination {
  lat?: number | null;
  lng?: number | null;
  address_line1?: string | null;
  city?: string | null;
  postcode?: string | null;
}

export type Platform = 'ios' | 'android' | 'web';

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'web';
}

function destinationLabel(destination: Destination): string {
  return [destination.address_line1, destination.city, destination.postcode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Hands the driving off to whatever the phone already uses: Apple Maps on iOS,
 * the Android geo: intent (which lets the driver pick Google Maps or Waze),
 * and Google Maps on the web. Coordinates win when we have them — a postcode
 * can put you at the wrong end of a long road.
 */
export function directionsUrl(destination: Destination, platform: Platform = 'web'): string {
  const label = destinationLabel(destination);
  const hasCoords = typeof destination.lat === 'number' && typeof destination.lng === 'number';
  const coords = hasCoords ? `${destination.lat},${destination.lng}` : '';

  if (platform === 'ios') {
    const query = hasCoords ? `daddr=${coords}` : `daddr=${encodeURIComponent(label)}`;
    return `maps://?${query}&dirflg=d`;
  }

  if (platform === 'android') {
    return hasCoords
      ? `geo:${coords}?q=${coords}(${encodeURIComponent(label || 'Job')})`
      : `geo:0,0?q=${encodeURIComponent(label)}`;
  }

  const query = hasCoords ? coords : label;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
