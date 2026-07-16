'use client';
import { useState, useEffect } from 'react';
import { pageApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiCode } from 'react-icons/fi';

function PageForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { title: '', content: '', seoTitle: '', seoDescription: '', isPublished: true });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?._id) await pageApi.update(initial._id, form);
      else await pageApi.create(form);
      toast.success(initial ? 'Page updated!' : 'Page created!');
      onSave();
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </div>

        {/* Content editor with toggle */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Content</label>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              {preview ? <><FiCode /> Edit HTML</> : <><FiEye /> Preview</>}
            </button>
          </div>
          {preview ? (
            <div
              className="min-h-[260px] max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-4 text-sm prose prose-sm max-w-none bg-white"
              dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-gray-400">Nothing to preview yet.</p>' }}
            />
          ) : (
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input font-mono text-xs"
              rows={12}
              placeholder="<h2>Heading</h2><p>Your content here...</p>"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">{form.content.length} characters · Toggle Preview to see rendered output</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
          <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
          <input value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="input" />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="pagePublished" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
          <label htmlFor="pagePublished" className="text-sm text-gray-700">Published</label>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchPages = () => {
    setLoading(true);
    pageApi.getAll({ limit: 100 })
      .then((res) => setPages(res.data.items || res.data.pages || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPages(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this page?')) return;
    try {
      await pageApi.delete(id);
      toast.success('Page deleted');
      fetchPages();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CMS Pages</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> New Page
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Title</th>
                <th className="table-header">Slug</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pages.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.title}</td>
                  <td className="table-cell font-mono text-sm text-gray-500">/{p.slug}</td>
                  <td className="table-cell"><span className={`badge text-xs ${p.isPublished ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td className="table-cell">{formatDate(p.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ type: 'edit', page: p })} className="text-gray-400 hover:text-primary-600"><FiEdit /></button>
                      <button onClick={() => handleDelete(p._id)} className="text-gray-400 hover:text-red-600"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-gray-400 py-10">No pages yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'New Page' : 'Edit Page'} size="xl">
        <PageForm
          initial={modal?.page}
          onSave={() => { setModal(null); fetchPages(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
