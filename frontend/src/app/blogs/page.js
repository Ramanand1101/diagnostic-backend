'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Pagination from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { blogApi } from '@/lib/api';
import { formatDate, truncate } from '@/utils/helpers';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 9;

  useEffect(() => {
    setLoading(true);
    blogApi.getAll({ page, limit, isPublished: true })
      .then((res) => {
        setBlogs(res.data.items || res.data.blogs || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Health Blog</h1>
          <p className="text-gray-500 mt-2">Tips, guides and insights for a healthier life</p>
        </div>

        {loading ? <PageLoader /> : blogs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No blogs published yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link key={blog._id} href={`/blogs/${blog.slug}`} className="card hover:shadow-md transition-shadow group">
                  {blog.coverImage && (
                    <div className="w-full h-44 rounded-lg overflow-hidden mb-4 bg-gray-100">
                      <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  {blog.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {blog.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="badge bg-primary-50 text-primary-700 text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                    {blog.title}
                  </h2>
                  {blog.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">{blog.excerpt}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(blog.createdAt)}</p>
                </Link>
              ))}
            </div>
            <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
