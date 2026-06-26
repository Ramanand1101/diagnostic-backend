'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Spinner';
import { pageApi } from '@/lib/api';

export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    pageApi.getBySlug(slug)
      .then((res) => setPage(res.data.page || res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <><Navbar /><PageLoader /><Footer /></>;
  if (notFound || !page) return <><Navbar /><div className="text-center py-20 text-gray-500">Page not found</div><Footer /></>;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
        <article
          className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </main>
      <Footer />
    </>
  );
}
