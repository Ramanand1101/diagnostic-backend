// Server Component with ISR — pre-renders at build time, refreshes every 60s
// Removes the client-side fetch waterfall (HTML shell → JS bundle → API call)
import { notFound } from 'next/navigation';
import Navbar  from '@/components/layout/Navbar';
import Footer  from '@/components/layout/Footer';
import ProductDetailClient from './ProductDetailClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const revalidate = 60; // ISR: re-render at most every 60 seconds

// Pre-generate popular slugs at build time (optional but speeds up first load)
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/products?limit=100&isActive=true`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return (data.items || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  try {
    const res = await fetch(`${API}/products/${params.slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: 'Test Not Found' };
    const product = await res.json();
    const tm = product.testMaster || {};
    return {
      title:       `${product.name} | HealthOnTime`,
      description: tm.description || `Book ${product.name} at ${product.lab?.name || 'top labs'} in your city.`,
      openGraph: {
        title:       product.name,
        description: tm.description || '',
        type:        'product',
      },
    };
  } catch {
    return { title: 'HealthOnTime' };
  }
}

export default async function ProductDetailPage({ params }) {
  const res = await fetch(`${API}/products/${params.slug}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) notFound();
  const product = await res.json();

  return (
    <>
      <Navbar />
      <ProductDetailClient product={product} />
      <Footer />
    </>
  );
}
