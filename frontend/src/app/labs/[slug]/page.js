import { notFound } from 'next/navigation';
import Navbar   from '@/components/layout/Navbar';
import Footer   from '@/components/layout/Footer';
import LabDetailClient from './LabDetailClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  try {
    const res = await fetch(`${API}/labs/${params.slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: 'Lab Not Found' };
    const data = await res.json();
    const lab = data.lab || data;
    return {
      title: `${lab.name} | HealthOnTime`,
      description: lab.description || `Book diagnostic tests at ${lab.name}, ${lab.city}. View available tests, prices, and reviews.`,
      openGraph: { title: lab.name, description: lab.description || '', type: 'website' },
    };
  } catch {
    return { title: 'HealthOnTime' };
  }
}

export default async function LabDetailPage({ params }) {
  const [labRes, prodRes] = await Promise.all([
    fetch(`${API}/labs/${params.slug}`,       { next: { revalidate: 60 } }),
    fetch(`${API}/products?limit=24&isActive=true`, { next: { revalidate: 60 } }),
  ]);

  if (!labRes.ok) notFound();

  const labData     = await labRes.json();
  const lab         = labData.lab || labData;
  const prodDataRaw = prodRes.ok ? await prodRes.json() : {};
  // Filter products for this lab after fetch (API needs lab ID, not slug)
  // The client component will re-fetch with the correct lab ID
  const initialProducts = (prodDataRaw.items || []).filter((p) => p.lab?._id === lab._id || p.lab === lab._id);

  return (
    <>
      <Navbar />
      <LabDetailClient lab={lab} initialProducts={initialProducts} />
      <Footer />
    </>
  );
}
