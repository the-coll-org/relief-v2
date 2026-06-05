// The 7 Lebanon map cluster markers (audit §3.4), positioned on the 250×326
// viewBox of public/map.svg. Each marker aggregates several district region_ids
// (the values /api/organizations/map keys its counts by). The 3 districts the
// old app omitted (zgharta, kesrwane, marjaayoun) are folded into their correct
// markers here so every organization is reachable from the map.

export interface MapMarker {
  id: string;
  nameKey: string; // messages key under map.cities.*
  x: number;
  y: number;
  regionIds: string[];
}

export const MAP_MARKERS: MapMarker[] = [
  { id: 'akkar', nameKey: 'akkar', x: 183, y: 22, regionIds: ['akkar'] },
  {
    id: 'tripoli',
    nameKey: 'tripoli',
    x: 106,
    y: 55,
    regionIds: ['tripoli', 'bcharre', 'el-koura', 'el-batroun', 'el-minieh-dennie', 'zgharta'],
  },
  {
    id: 'beirut',
    nameKey: 'beirut',
    x: 60,
    y: 155,
    regionIds: ['beirut', 'aley', 'baabda', 'chouf', 'el-meten', 'jbeil', 'kesrwane'],
  },
  { id: 'baalbek', nameKey: 'baalbek', x: 182, y: 130, regionIds: ['baalbek', 'el-hermel'] },
  { id: 'bekaa', nameKey: 'bekaa', x: 132, y: 200, regionIds: ['zahle', 'west-bekaa', 'rachaya'] },
  {
    id: 'nabatieh',
    nameKey: 'nabatieh',
    x: 70,
    y: 232,
    regionIds: ['el-nabatieh', 'bent-jbeil', 'hasbaya', 'marjaayoun'],
  },
  { id: 'south', nameKey: 'south', x: 35, y: 270, regionIds: ['saida', 'sour', 'jezzine'] },
];

/** Which marker owns a given district region_id (for ?focus= deep-links). */
export function markerForRegion(regionId: string): MapMarker | undefined {
  return MAP_MARKERS.find((m) => m.regionIds.includes(regionId));
}
