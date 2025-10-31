export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getPolygonCenter(coordinates: number[][][]): [number, number] {
  const firstRing = coordinates[0];
  let sumLat = 0, sumLon = 0;
  firstRing.forEach(coord => {
    sumLon += coord[0];
    sumLat += coord[1];
  });
  return [sumLon / firstRing.length, sumLat / firstRing.length];
}
