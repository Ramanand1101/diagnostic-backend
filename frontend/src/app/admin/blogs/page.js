'use client';
import { useState, useEffect } from 'react';
import { blogApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

function BlogForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title: '', excerpt: '', content: '', coverImage: '', tags: '', isPublished: true });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [] };
    try {
      if (initial?._id) await blogApi.update(initial._id, payload);
      else await blogApi.create(payload);
      toast.success(initial ? 'Blog updated!' : 'Blog created!');
      onSave();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
        <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="input" rows={2} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input font-mono text-xs" rows={8} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
        <input type="url" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
        <input value={typeof form.tags === 'string' ? form.tags : form.tags?.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" placeholder="health, blood test, tips" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="published" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
        <label htmlFor="published" className="text-sm text-gray-700">Published</label>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const limit = 15;

  const fetchBlogs = () => {
    setLoading(true);
    blogApi.getAll({ page, limit })
      .then((res) => {
        setBlogs(res.data.items || res.data.blogs || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBlogs(); }, [page]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this blog?')) return;
    try {
      await blogApi.delete(id);
      toast.success('Blog deleted');
      fetchBlogs();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blogs</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> New Blog
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Title</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blogs.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{b.title}</td>
                  <td className="table-cell"><span className={`badge text-xs ${b.isPublished ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td className="table-cell">{formatDate(b.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', blog: b })} className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                      <button onClick={() => handleDelete(b._id)} className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'New Blog' : 'Edit Blog'} size="xl">
        <BlogForm
          initial={modal?.blog ? { ...modal.blog, tags: modal.blog.tags?.join(', ') } : null}
          onSave={() => { setModal(null); fetchBlogs(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
