// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2025-2026 Ancient Nerds Contributors.
// Adapted for Archa from ancientnerds/AncientMap@7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe. See UPSTREAM.md and LICENSE.
/**
 * Lat/lng to a point on the sphere of radius r: the formula of the basemap sphere and of every
 * vector layer (sceneInit.ts). Keep the evaluation order: the first frame must stay pixel-identical.
 */
export function latLngTo3DArray(lat, lng, r) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ]
}

/**
 * Check if a line segment is an artificial Antarctic boundary
 * (straight lines at 0°, ±90°, ±180° longitude dividing ice sheet sectors).
 * scripts/build_globe_layers.py ports this rule to drop the segments before it simplifies.
 */
export function isArtificialAntarcticBoundary(coord1, coord2) {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2
  // Only check Antarctica (lat < -60)
  if (lat1 > -60 && lat2 > -60) return false
  // Check if segment is at a round longitude (tolerance 0.5°)
  for (const roundLon of [0, 90, -90, 180, -180]) {
    if (Math.abs(lon1 - roundLon) < 0.5 && Math.abs(lon2 - roundLon) < 0.5) {
      // Check if it's a significant vertical segment (spans > 2° latitude)
      if (Math.abs(lat1 - lat2) > 2) return true
    }
  }
  // Also check horizontal lines at -90° latitude (South Pole connections)
  if (Math.abs(lat1 - (-90)) < 0.5 && Math.abs(lat2 - (-90)) < 0.5) {
    if (Math.abs(lon1 - lon2) > 10) return true
  }
  return false
}

/** The lines of one feature: LineString → [coords]; MultiLineString, Polygon → coords; MultiPolygon → rings. */
function featureLines(geometry) {
  switch (geometry.type) {
    case 'LineString': return [geometry.coordinates]
    case 'MultiLineString':
    case 'Polygon': return geometry.coordinates
    case 'MultiPolygon': return (geometry.coordinates).flat()
    default: return []
  }
}

/**
 * Explicit segment pairs (LineSegments, no NaN separators: NaN vertices corrupt geometry on
 * ANGLE/Metal), artificial Antarctic segments skipped. Two passes: count, then fill one
 * pre-sized Float32Array per radius.
 */
export function buildSegmentPositions(features, radii) {
  let segments = 0
  for (const feature of features) {
    for (const coords of featureLines(feature.geometry)) {
      for (let i = 0; i < coords.length - 1; i++) {
        if (!isArtificialAntarcticBoundary(coords[i], coords[i + 1])) segments++
      }
    }
  }

  const out = radii.map(() => new Float32Array(segments * 6))
  let offset = 0
  const write = (p) => {
    const phi = (90 - p[1]) * Math.PI / 180
    const theta = (p[0] + 180) * Math.PI / 180
    const sinPhi = Math.sin(phi)
    const cosPhi = Math.cos(phi)
    const sinTheta = Math.sin(theta)
    const cosTheta = Math.cos(theta)
    for (let k = 0; k < radii.length; k++) {
      const r = radii[k]
      const target = out[k]
      // Same operand order as latLngTo3DArray: (-r * sinφ) * cosθ, r * cosφ, (r * sinφ) * sinθ
      target[offset] = -r * sinPhi * cosTheta
      target[offset + 1] = r * cosPhi
      target[offset + 2] = r * sinPhi * sinTheta
    }
    offset += 3
  }
  for (const feature of features) {
    for (const coords of featureLines(feature.geometry)) {
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i]
        const b = coords[i + 1]
        if (isArtificialAntarcticBoundary(a, b)) continue
        write(a)
        write(b)
      }
    }
  }
  return out
}

