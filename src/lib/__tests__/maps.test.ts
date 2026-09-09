import { describe, expect, it } from 'vitest';
import { detectPlatform, directionsUrl, telHref } from '@/lib/maps';

const destination = {
  lat: 51.4485,
  lng: -0.9735,
  address_line1: '12 Elm Grove',
  city: 'Reading',
  postcode: 'RG1 5AA',
};

describe('detectPlatform', () => {
  it('spots an iPhone', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('ios');
  });
  it('spots an Android phone', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android');
  });
  it('falls back to the web', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('web');
  });
});

describe('directionsUrl', () => {
  it('opens Apple Maps on iOS', () => {
    expect(directionsUrl(destination, 'ios')).toBe('maps://?daddr=51.4485,-0.9735&dirflg=d');
  });

  it('uses the geo: intent on Android so the driver keeps their own app', () => {
    expect(directionsUrl(destination, 'android')).toContain('geo:51.4485,-0.9735');
  });

  it('falls back to Google Maps on the web', () => {
    const url = directionsUrl(destination, 'web');
    expect(url).toContain('https://www.google.com/maps/dir/');
    expect(url).toContain('travelmode=driving');
  });

  it('uses the address when there are no coordinates', () => {
    const url = directionsUrl({ ...destination, lat: null, lng: null }, 'web');
    expect(url).toContain(encodeURIComponent('12 Elm Grove, Reading, RG1 5AA'));
  });
});

describe('telHref', () => {
  it('strips the spaces out of a phone number', () => {
    expect(telHref('07700 900 123')).toBe('tel:07700900123');
  });
  it('is null when there is no number', () => {
    expect(telHref(null)).toBeNull();
  });
});
