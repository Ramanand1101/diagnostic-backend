'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Spinner';
import { blogApi } from '@/lib/api';
import { formatDate } from '@/utils/helpers';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogApi.getBySlug(slug)
      .then((res) => setBlog(res.data.blog || res.data))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <><Navbar /><PageLoader /><Footer /></>;
  if (!blog) return <><Navbar /><div className="text-center py-20">Blog not found</div><Footer /></>;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Home</Link> &gt;{' '}
          <Link href="/blogs" className="hover:text-primary-600">Blog</Link> &gt;{' '}
          <span className="text-gray-700">{blog.title}</span>
        </nav>

        {blog.coverImage && (
          <div className="w-full h-72 rounded-2xl overflow-hidden mb-8 bg-gray-100">
            <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}

        {blog.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blog.tags.map((tag) => (
              <span key={tag} className="badge bg-primary-50 text-primary-700 text-xs">{tag}</span>
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-3">{blog.title}</h1>
        <p className="text-sm text-gray-400 mb-8">{formatDate(blog.createdAt)}</p>

        {blog.excerpt && (
          <p className="text-lg text-gray-600 font-medium mb-6 border-l-4 border-primary-500 pl-4">{blog.excerpt}</p>
        )}

        <article
          className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blog.content || '<p>Content coming soon...</p>' }}
        />
      </main>
      <Footer />
    </>
  );
}
