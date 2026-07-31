// Turns a city name from the DB ("New Delhi") into a URL-safe slug ("new-delhi").
// Kept in one place so the homepage city links and the /city/[city] route always agree.
export function slugifyCity(city) {
  return (city || '').toLowerCase().trim().replace(/\s+/g, '-');
}
