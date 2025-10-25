/**
 * Utilitários para operações geométricas
 */

/**
 * Calcula o centroide de um polígono GeoJSON
 * 
 * @param coordinates - Array de coordenadas do polígono [[lng, lat], [lng, lat], ...]
 * @returns { latitude, longitude } do centroide
 */
export function calculatePolygonCentroid(coordinates: number[][][]): { latitude: number; longitude: number } | null {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  // Pegar o primeiro anel (exterior) do polígono
  const ring = coordinates[0];

  if (!ring || ring.length < 3) {
    return null;
  }

  let xSum = 0;
  let ySum = 0;
  let count = 0;

  // Calcular média das coordenadas (centroide simples)
  // Nota: Ignora o último ponto se for igual ao primeiro (polígono fechado)
  const pointsToCount = ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;

  for (let i = 0; i < pointsToCount; i++) {
    const [lng, lat] = ring[i];
    xSum += lng;
    ySum += lat;
    count++;
  }

  if (count === 0) {
    return null;
  }

  return {
    longitude: xSum / count,
    latitude: ySum / count
  };
}

/**
 * Calcula o ponto mais ao norte (maior latitude) de um polígono
 * Útil para sugerir entrada/portão no topo da propriedade
 */
export function findNorthernmostPoint(coordinates: number[][][]): { latitude: number; longitude: number } | null {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return null;
  }

  let maxLat = -Infinity;
  let maxLng = 0;

  for (const [lng, lat] of ring) {
    if (lat > maxLat) {
      maxLat = lat;
      maxLng = lng;
    }
  }

  if (maxLat === -Infinity) {
    return null;
  }

  return {
    latitude: maxLat,
    longitude: maxLng
  };
}

/**
 * Encontra o ponto da geometria mais próximo de uma coordenada dada
 */
export function findClosestVertex(
  coordinates: number[][][],
  targetLat: number,
  targetLng: number
): { latitude: number; longitude: number; index: number } | null {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return null;
  }

  let minDistance = Infinity;
  let closestPoint: { latitude: number; longitude: number; index: number } | null = null;

  ring.forEach(([lng, lat], index) => {
    const distance = Math.sqrt(
      Math.pow(lat - targetLat, 2) + Math.pow(lng - targetLng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = {
        latitude: lat,
        longitude: lng,
        index
      };
    }
  });

  return closestPoint;
}

/**
 * Valida se um ponto está dentro de um bounding box do polígono
 */
export function isPointInBounds(
  coordinates: number[][][],
  lat: number,
  lng: number
): boolean {
  if (!coordinates || coordinates.length === 0) {
    return false;
  }

  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return false;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [longitude, latitude] of ring) {
    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
    minLng = Math.min(minLng, longitude);
    maxLng = Math.max(maxLng, longitude);
  }

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Verifica se um ponto está dentro de um polígono usando o algoritmo Ray Casting
 * 
 * @param coordinates - Coordenadas do polígono no formato GeoJSON [[[lng, lat], [lng, lat], ...]]
 * @param lat - Latitude do ponto a verificar
 * @param lng - Longitude do ponto a verificar
 * @returns true se o ponto está dentro do polígono, false caso contrário
 */
export function isPointInPolygon(
  coordinates: number[][][],
  lat: number,
  lng: number
): boolean {
  if (!coordinates || coordinates.length === 0) {
    return false;
  }

  // Pegar o anel exterior do polígono
  const ring = coordinates[0];
  if (!ring || ring.length < 3) {
    return false;
  }

  // Algoritmo Ray Casting
  // Traça uma linha horizontal do ponto para o infinito e conta quantas vezes cruza o polígono
  // Se cruzar um número ímpar de vezes, o ponto está dentro
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    // Verifica se a aresta cruza a linha horizontal passando pelo ponto
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Valida se um ponto está dentro ou muito próximo do polígono (com margem de tolerância)
 * Útil para pontos na borda da propriedade
 * 
 * @param coordinates - Coordenadas do polígono
 * @param lat - Latitude do ponto
 * @param lng - Longitude do ponto
 * @param toleranceMeters - Margem de tolerância em metros (padrão: 100m)
 * @returns true se o ponto está dentro ou próximo do polígono
 */
export function isPointInPolygonWithTolerance(
  coordinates: number[][][],
  lat: number,
  lng: number,
  toleranceMeters: number = 100
): boolean {
  // Primeiro verifica se está exatamente dentro
  if (isPointInPolygon(coordinates, lat, lng)) {
    return true;
  }

  // Se não estiver dentro, verifica se está próximo o suficiente
  // Converte tolerância de metros para graus (aproximado)
  // 1 grau ≈ 111km, então dividimos por 111000
  const toleranceDegrees = toleranceMeters / 111000;

  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return false;
  }

  // Verifica distância para cada vértice
  for (const [longitude, latitude] of ring) {
    const distance = Math.sqrt(
      Math.pow(latitude - lat, 2) + Math.pow(longitude - lng, 2)
    );

    if (distance <= toleranceDegrees) {
      return true;
    }
  }

  return false;
}


