import { notFound } from 'next/navigation';
import Navbar  from '@/components/layout/Navbar';
import Footer  from '@/components/layout/Footer';
import ProductDetailClient from './ProductDetailClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const revalidate = 60;
export const dynamicParams = true;

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
