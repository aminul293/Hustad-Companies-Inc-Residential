import { NextRequest, NextResponse } from "next/server";

/**
 * NWS LSR (Local Storm Report) Parser
 * Extracts structured data from raw NWS text products.
 */
function parseLSRText(text: string) {
  const reports: any[] = [];
  // LSRs typically follow a specific columnar format
  // Example: 0539 PM     HAIL             1 E MADISON             43.07N 89.37W
  //          04/14/2026  M3.25 INCH       DANE               WI   PUBLIC
  
  const lines = text.split('\n');
  let currentReport: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for the header line (Time, Event, City/Location, Lat/Long)
    const headerMatch = line.match(/^(\d{4}\s+(?:AM|PM))\s+(HAIL|TSTM\s+WND|TORNADO|FLOOD)\s+(.+?)\s+(\d+\.\d+[NS]\s+\d+\.\d+[EW])$/i);
    
    if (headerMatch) {
      if (currentReport) reports.push(currentReport);
      currentReport = {
        time: headerMatch[1],
        type: headerMatch[2],
        location: headerMatch[3].trim(),
        coords: headerMatch[4],
        details: "",
        reference: ""
      };
      continue;
    }

    // Look for the detail line (Date, Size/Speed, County, State, Source)
    if (currentReport && !currentReport.reference) {
      const detailMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+([A-Z]\d+\.?\d*\s+[A-Z]+)\s+(.+?)\s+([A-Z]{2})\s+([A-Z\s]+)$/i);
      if (detailMatch) {
        currentReport.date = detailMatch[1];
        currentReport.magnitude = detailMatch[2];
        currentReport.county = detailMatch[3].trim();
        currentReport.state = detailMatch[4];
        currentReport.source = detailMatch[5].trim();
        currentReport.reference = `NWS LSR: ${currentReport.location}, ${currentReport.magnitude}`;
        continue;
      }
    }

    // Capture comments/details
    if (currentReport && line && !line.startsWith('---')) {
      if (currentReport.details.length < 200) {
        currentReport.details += (currentReport.details ? " " : "") + line;
      }
    }
  }

  if (currentReport) reports.push(currentReport);
  return reports;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    let office = searchParams.get("office") || "MKX";

    // 1. If coordinates are provided, discover the correct NWS office
    if (lat && lon) {
      const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
        headers: { "User-Agent": "(hustad-tablet-platform, tech@hustad.com)" }
      });
      if (pointRes.ok) {
        const pointData = await pointRes.json();
        // Extract the office ID from the gridId or forecast office URL
        const officeId = pointData.properties?.gridId || pointData.properties?.cwa;
        if (officeId) office = officeId;
      }
    }

    // 2. Fetch list of recent LSR products for this office
    const listRes = await fetch(`https://api.weather.gov/products/types/LSR/locations/${office}`, {
      headers: { "User-Agent": "(hustad-tablet-platform, tech@hustad.com)" }
    });

    if (!listRes.ok) throw new Error("Failed to fetch NWS product list");
    const listData = await listRes.json();
    const latestProducts = listData["@graph"]?.slice(0, 3) || [];

    const allReports: any[] = [];

    // 2. Fetch and parse each product
    for (const prod of latestProducts) {
      const prodRes = await fetch(prod["@id"], {
        headers: { "User-Agent": "(hustad-tablet-platform, tech@hustad.com)" }
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const reports = parseLSRText(prodData.productText || "");
        allReports.push(...reports);
      }
    }

    // 3. Filter for Hail/Wind and return
    const filtered = allReports
      .filter(r => r.type === "HAIL" || r.type === "TSTM WND")
      .slice(0, 10);

    return NextResponse.json({ 
      office,
      generatedAt: new Date().toISOString(),
      reports: filtered 
    });

  } catch (error: any) {
    console.error("NWS Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
