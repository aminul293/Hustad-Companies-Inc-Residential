import { NextRequest, NextResponse } from "next/server";

const UA = "hustad-tablet-platform/1.0 (aminul@hustadcompanies.com)";

/** Shoelace formula — area of a polygon from lat/lon pairs, in sq meters */
function polygonAreaSqMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  // Calculate centroid (mean lat and lon) to translate polygon to origin.
  // This prevents floating point catastrophic cancellation in the shoelace formula.
  const meanLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const meanLon = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  
  const latM = 111320; // 1 degree latitude ≈ 111,320 m
  const lonM = 111320 * Math.cos((meanLat * Math.PI) / 180);

  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % n];
    
    const x1 = (lon1 - meanLon) * lonM;
    const y1 = (lat1 - meanLat) * latM;
    const x2 = (lon2 - meanLon) * lonM;
    const y2 = (lat2 - meanLat) * latM;
    
    area += (x1 * y2) - (x2 * y1);
  }
  return Math.abs(area / 2);
}

/**
 * GET /api/property-data?address=…&cityStateZip=…
 *
 * 1. Geocode address via Nominatim (OpenStreetMap) — free, no key
 * 2. Query Overpass for the building footprint polygon at that location
 * 3. Calculate footprint area → apply a 1.15 pitch factor for roofing area
 * 4. Return sq ft figures + data source metadata
 */
export async function GET(req: NextRequest) {
  const address     = req.nextUrl.searchParams.get("address") ?? "";
  const cityStateZip = req.nextUrl.searchParams.get("cityStateZip") ?? "";

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const fullAddress = [address, cityStateZip].filter(Boolean).join(", ");

  // ── 1. Geocode ───────────────────────────────────────────────────────────────
  const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&addressdetails=1`;
  const geoRes = await fetch(geoUrl, {
    headers: { "User-Agent": UA },
  });

  if (!geoRes.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  const geoData = await geoRes.json();
  if (!geoData.length) {
    return NextResponse.json({ error: "Address not found. Try including city and state." }, { status: 404 });
  }

  const { lat, lon, display_name } = geoData[0];
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  const overpassQuery = `
    [out:json][timeout:10];
    (
      way(around:150,${latF},${lonF})[building];
      relation(around:150,${latF},${lonF})[building];
    );
    out geom;
  `.trim();

  const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  let footprintSqFt: number | null = null;
  let roofingSqFt:   number | null = null;
  let source = "OpenStreetMap";
  if (overpassRes.ok) {
    const overpassData = await overpassRes.json();
    
    // ── 3. Find ALL building footprints and calculate areas ────────────────────
    const buildings = [];
    let closestDist = Infinity;
    let defaultTargetArea = 0;
    
    for (const el of overpassData.elements ?? []) {
      if (el.type === "way" && el.geometry?.length) {
        const coords: [number, number][] = el.geometry.map((g: any) => [g.lat, g.lon]);
        
        const meanBldgLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const meanBldgLon = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const dist = Math.hypot(meanBldgLat - latF, meanBldgLon - lonF);
        
        const areaSqM = polygonAreaSqMeters(coords);
        if (areaSqM > 0) {
          const sqFt = Math.round(areaSqM * 10.764);
          const roofSqFt = Math.round(sqFt * 1.15);
          
          buildings.push({
            id: el.id,
            polygon: coords,
            footprintSqFt: sqFt,
            roofingSqFt: roofSqFt,
            dist: dist
          });

          if (dist < closestDist) {
            closestDist = dist;
            defaultTargetArea = areaSqM;
          }
        }
      }
    }

    // ── 4. Determine response values ───────────────────────────────────────────
    let footprintSqFt: number | null = null;
    let roofingSqFt: number | null = null;
    let confidence = "not_found";

    if (defaultTargetArea > 0) {
      const sqFt = Math.round(defaultTargetArea * 10.764);
      footprintSqFt = sqFt;
      // Apply 1.15 pitch factor
      roofingSqFt   = Math.round(sqFt * 1.15);
      confidence    = "measured";
    }

    return NextResponse.json({
      address: geoData[0].display_name,
      lat: latF,
      lon: lonF,
      footprintSqFt,
      roofingSqFt,
      allBuildings: buildings,
      pitchFactor: 1.15,
      source: "OpenStreetMap",
      confidence,
      note: confidence === "not_found"
        ? "Building footprint not in OpenStreetMap for this address. Enter manually."
        : "Footprint from OpenStreetMap. Roofing area includes 1.15× pitch factor."
    });
  }

  return NextResponse.json({
    address: display_name,
    lat: latF,
    lon: lonF,
    footprintSqFt: null,
    roofingSqFt: null,
    pitchFactor: 1.15,
    source: "OpenStreetMap",
    confidence: "not_found",
    note: "Could not reach OpenStreetMap."
  });
}
