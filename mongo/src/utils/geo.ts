import type { LatLng } from "../types/geo.js";

/** Converte "lat,lng" em {lat, lng}. Retorna undefined se inválido. */
export function parseLatLngPair(pair?: string): LatLng | undefined {
  if (!pair) return undefined;
  const [latStr, lngStr] = pair.split(",").map(s => s.trim());
  const lat = Number(latStr), lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

/** Valida ranges: lat ∈ [-90,90], lng ∈ [-180,180] */
export function isValidLatLng({ lat, lng }: LatLng): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Constrói sw/ne a partir de bbox ou pares (útil nos controllers). */
export function parseViewportFromQuery(q: {
  bbox?: string;
  sw?: string; ne?: string;
  swLat?: string | number; swLng?: string | number;
  neLat?: string | number; neLng?: string | number;
}): { sw: LatLng; ne: LatLng } | { error: string } {
  // 1) bbox=west,south,east,north
  if (q.bbox) {
    const [wStr, sStr, eStr, nStr] = q.bbox.split(",").map(s => s.trim());
    const west = Number(wStr), south = Number(sStr), east = Number(eStr), north = Number(nStr);
    if (![west, south, east, north].every(Number.isFinite)) {
      return { error: "bbox inválido. Use bbox=west,south,east,north" };
    }
    const sw = { lat: south, lng: west }, ne = { lat: north, lng: east };
    if (!isValidLatLng(sw) || !isValidLatLng(ne) || ne.lat <= sw.lat || ne.lng <= sw.lng) {
      return { error: "Viewport inválido derivado de bbox." };
    }
    return { sw, ne };
  }

  // 2) sw=lat,lng & ne=lat,lng
  const swPair = parseLatLngPair(q.sw);
  const nePair = parseLatLngPair(q.ne);
  if (swPair && nePair) {
    if (!isValidLatLng(swPair) || !isValidLatLng(nePair) || nePair.lat <= swPair.lat || nePair.lng <= swPair.lng) {
      return { error: "Viewport inválido em sw/ne." };
    }
    return { sw: swPair, ne: nePair };
  }

  // 3) swLat,swLng,neLat,neLng
  const swLat = q.swLat !== undefined ? Number(q.swLat) : undefined;
  const swLng = q.swLng !== undefined ? Number(q.swLng) : undefined;
  const neLat = q.neLat !== undefined ? Number(q.neLat) : undefined;
  const neLng = q.neLng !== undefined ? Number(q.neLng) : undefined;

  if ([swLat, swLng, neLat, neLng].every(v => typeof v === "number" && Number.isFinite(v!))) {
    const sw = { lat: swLat as number, lng: swLng as number };
    const ne = { lat: neLat as number, lng: neLng as number };
    if (!isValidLatLng(sw) || !isValidLatLng(ne) || ne.lat <= sw.lat || ne.lng <= sw.lng) {
      return { error: "Viewport inválido em swLat/swLng/neLat/neLng." };
    }
    return { sw, ne };
  }

  return { error: "Parâmetros de viewport ausentes. Use bbox, sw/ne ou swLat/…/neLng." };
}
