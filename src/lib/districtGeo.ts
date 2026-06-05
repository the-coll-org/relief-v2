// Approximate centroids (lat,lng) for the 26 Lebanese districts (cazas), used
// to sort organizations by zone proximity for the "Closest to me" pill.
// Coordinates are coarse district centroids — adequate for proximity ranking.

export const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  akkar: [34.55, 36.1],
  aley: [33.8, 35.6],
  baabda: [33.83, 35.54],
  baalbek: [34.0, 36.21],
  bcharre: [34.25, 36.01],
  beirut: [33.89, 35.5],
  'bent-jbeil': [33.12, 35.43],
  chouf: [33.7, 35.6],
  'el-batroun': [34.25, 35.66],
  'el-hermel': [34.39, 36.38],
  'el-koura': [34.3, 35.8],
  'el-meten': [33.87, 35.62],
  'el-minieh-dennie': [34.47, 36.0],
  'el-nabatieh': [33.38, 35.48],
  hasbaya: [33.4, 35.68],
  jbeil: [34.12, 35.65],
  jezzine: [33.54, 35.58],
  kesrwane: [34.0, 35.65],
  marjaayoun: [33.36, 35.59],
  rachaya: [33.5, 35.84],
  saida: [33.56, 35.38],
  sour: [33.27, 35.2],
  tripoli: [34.44, 35.84],
  'west-bekaa': [33.62, 35.78],
  zahle: [33.85, 35.9],
  zgharta: [34.4, 35.9],
};

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function haversine(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/** Distance (km) from a point to an org's nearest known district, or Infinity. */
export function distanceToDistricts(
  user: [number, number],
  districts: string[]
): number {
  let min = Infinity;
  for (const d of districts) {
    const c = DISTRICT_CENTROIDS[slug(d)];
    if (c) min = Math.min(min, haversine(user, c));
  }
  return min;
}
