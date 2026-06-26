'use client';
import { useState, useEffect, useRef } from 'react';
import { heroSlideApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiTrash2, FiImage,
  FiToggleLeft, FiToggleRight, FiUpload, FiX,
} from 'react-icons/fi';

const EMPTY_FORM = {
  imageUrl: '',
  title: '',
  subtitle: '',
  ctaLabel: 'Book Now',
  ctaLink: '',
  sortOrder: 0,
  isActive: true,
};

// value      = canonical S3 URL (what gets saved to DB)
// displayUrl = presigned URL (what <img> actually loads)
function ImageUploader({ value, displayUrl, onUploaded, onClear, onUrlChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('upload');
  const [imgError, setImgError] = useState(false);

  const previewSrc = displayUrl || value;
  useEffect(() => { setImgError(false); }, [previewSrc]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, WEBP or GIF allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await heroSlideApi.uploadImage(fd);
      // res.data = { url: canonicalS3Url, previewUrl: signedUrl }
      onUploaded(res.data.url, res.data.previewUrl);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Upload failed. Check S3 credentials.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Image *</label>

      <div className="flex text-xs font-medium border border-gray-200 rounded-lg overflow-hidden w-fit">
        {['upload', 'url'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-1.5 transition ${tab === t ? 'bg-sky-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t === 'upload' ? 'Upload File' : 'Paste URL'}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div onClick={() => !uploading && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition
            ${uploading ? 'opacity-60 cursor-wait border-sky-300' : 'border-gray-300 hover:border-sky-400 hover:bg-sky-50'}`}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden" onChange={handleFile} />
          {uploading ? (
            <p className="text-sm text-sky-600 font-medium animate-pulse">Uploading to S3...</p>
          ) : (
            <>
              <FiUpload className="text-2xl text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to choose image</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF · max 5 MB</p>
            </>
          )}
        </div>
      ) : (
        <input type="url" value={value} onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://res.cloudinary.com/..." className="input" />
      )}

      {/* Preview */}
      {previewSrc && (
        <div className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          {imgError ? (
            <div className="flex flex-col items-center justify-center py-5 px-4 text-center gap-1">
              <FiImage className="text-2xl text-amber-500" />
              <p className="text-xs font-medium text-amber-700">Could not load preview</p>
              <p className="text-xs text-gray-400 break-all mt-1">{value}</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="slide preview"
              onError={() => setImgError(true)}
              className="w-full h-36 object-cover" />
          )}
          <button type="button" onClick={onClear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <FiX size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function SlideForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial ? {
      imageUrl: initial._imageKey || initial.imageUrl || '',
      title: initial.title || '',
      subtitle: initial.subtitle || '',
      ctaLabel: initial.ctaLabel || 'Book Now',
      ctaLink: initial.ctaLink || '',
      sortOrder: initial.sortOrder ?? 0,
      isActive: initial.isActive ?? true,
    } : { ...EMPTY_FORM }
  );
  // displayImageUrl = presigned URL for preview only, NOT saved to DB
  const [displayImageUrl, setDisplayImageUrl] = useState(initial?.imageUrl || '');
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleUploaded = (canonicalUrl, previewUrl) => {
    set('imageUrl', canonicalUrl);
    setDisplayImageUrl(previewUrl || canonicalUrl);
  };

  const handleUrlChange = (url) => {
    set('imageUrl', url);
    setDisplayImageUrl(url);
  };

  const handleClear = () => {
    set('imageUrl', '');
    setDisplayImageUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.imageUrl.trim()) { toast.error('Please upload or paste an image URL'); return; }
    setSaving(true);
    try {
      if (initial?._id) await heroSlideApi.update(initial._id, form);
      else await heroSlideApi.create(form);
      toast.success(initial ? 'Slide updated!' : 'Slide added!');
      onSave();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ImageUploader
        value={form.imageUrl}
        displayUrl={displayImageUrl}
        onUploaded={handleUploaded}
        onUrlChange={handleUrlChange}
        onClear={handleClear}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Full Body Checkup" className="input" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
          <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)}
            placeholder="Comprehensive health tests at home" className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
          <input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)}
            placeholder="Book Now" className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
          <input value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)}
            placeholder="/tests/full-body-checkup" className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" min="0" value={form.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))} className="input" />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="w-4 h-4 rounded text-primary-600" />
            Active (visible on homepage)
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Slide'}
        </button>
      </div>
    </form>
  );
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchSlides = () => {
    setLoading(true);
    heroSlideApi.getAll()
      .then((res) => setSlides(res.data || []))
      .catch(() => toast.error('Failed to load slides'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlides(); }, []);

  const handleDelete = async (slide) => {
    if (!confirm(`Delete slide "${slide.title}"?`)) return;
    try {
      await heroSlideApi.delete(slide._id);
      toast.success('Slide deleted');
      fetchSlides();
    } catch { toast.error('Delete failed'); }
  };

  const handleToggleActive = async (slide) => {
    try {
      await heroSlideApi.update(slide._id, { isActive: !slide.isActive });
      toast.success(slide.isActive ? 'Slide hidden' : 'Slide activated');
      fetchSlides();
    } catch { toast.error('Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Slides</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the homepage banner slider</p>
        </div>
        <button onClick={() => setModal({ type: 'add' })}
          className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> Add Slide
        </button>
      </div>

      {loading ? <PageLoader /> : slides.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FiImage className="text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No slides yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Slide" to upload your first banner image.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <div key={slide._id} className="card p-4 flex items-center gap-4">
              {/* Thumbnail — use plain <img> so presigned query params aren't stripped */}
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{slide.title}</p>
                {slide.subtitle && <p className="text-sm text-gray-500 truncate">{slide.subtitle}</p>}
                <p className="text-xs text-gray-400 mt-0.5">Order: {slide.sortOrder}</p>
              </div>

              <span className={`badge text-xs shrink-0 ${slide.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {slide.isActive ? 'Active' : 'Hidden'}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleToggleActive(slide)}
                  title={slide.isActive ? 'Hide slide' : 'Show slide'}
                  className={`text-xl transition ${slide.isActive ? 'text-green-500 hover:text-gray-400' : 'text-gray-300 hover:text-green-500'}`}>
                  {slide.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                </button>
                <button onClick={() => setModal({ type: 'edit', slide })}
                  className="text-gray-400 hover:text-primary-600 transition"><FiEdit /></button>
                <button onClick={() => handleDelete(slide)}
                  className="text-gray-400 hover:text-red-600 transition"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Add Hero Slide' : 'Edit Hero Slide'} size="lg">
        <SlideForm
          initial={modal?.slide}
          onSave={() => { setModal(null); fetchSlides(); }}
          onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
