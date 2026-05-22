import { NextRequest, NextResponse } from "next/server";

const UA = "hustad-tablet-platform/1.0 (aminul@hustadcompanies.com)";

/** Shoelace formula — area of a polygon from lat/lon pairs, in sq meters */
function polygonAreaSqMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  // Convert degrees to approximate meters using equirectangular projection
  // centered on the polygon's mean latitude
  const meanLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const latM = 111320; // 1 degree latitude ≈ 111,320 m
  const lonM = 111320 * Math.cos((meanLat * Math.PI) / 180);

  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % n];
    area += lon1 * lonM * lat2 * latM - lon2 * lonM * lat1 * latM;
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

  // ── 2. Building footprint via Overpass ───────────────────────────────────────
  const overpassQuery = `
    [out:json][timeout:10];
    (
      way(around:60,${latF},${lonF})[building];
      relation(around:60,${latF},${lonF})[building];
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
  let confidence: "measured" | "estimated" | "not_found" = "not_found";

  if (overpassRes.ok) {
    const overpassData = await overpassRes.json();
    const elements: any[] = overpassData.elements ?? [];

    // Find the largest building footprint (most likely the main structure)
    let maxArea = 0;
    for (const el of elements) {
      if (el.type === "way" && el.geometry?.length) {
        const coords: [number, number][] = el.geometry.map((g: any) => [g.lat, g.lon]);
        const areaSqM = polygonAreaSqMeters(coords);
        if (areaSqM > maxArea) maxArea = areaSqM;
      }
    }

    if (maxArea > 0) {
      const sqFt = Math.round(maxArea * 10.764);
      footprintSqFt = sqFt;
      // Apply 1.15 pitch factor — typical for residential roofs (4/12 to 6/12 pitch)
      roofingSqFt   = Math.round(sqFt * 1.15);
      confidence    = "measured";
    }
  }

  return NextResponse.json({
    address: display_name,
    lat: latF,
    lon: lonF,
    footprintSqFt,
    roofingSqFt,
    pitchFactor: 1.15,
    source,
    confidence,
    note: confidence === "not_found"
      ? "Building footprint not in OpenStreetMap for this address. Enter manually."
      : "Footprint from OpenStreetMap. Roofing area includes 1.15× pitch factor.",
  });
}
