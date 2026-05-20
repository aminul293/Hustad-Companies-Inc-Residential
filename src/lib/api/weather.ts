export async function fetchWeatherNws(coords?: { lat: number; lon: number } | null): Promise<Response> {
  const url = coords
    ? `/api/weather/nws?lat=${coords.lat}&lon=${coords.lon}`
    : "/api/weather/nws?office=MKX";
  return fetch(url);
}
