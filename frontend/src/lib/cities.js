const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export async function getApprovedCities() {
  try {
    const res = await fetch(`${API}/labs/cities`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cities || [];
  } catch {
    return [];
  }
}
