'use client';
import { useState, useEffect, useCallback } from 'react';
import { categoryApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiTag, FiFolder } from 'react-icons/fi';

function CategoryForm({ initial, parentId, parentName, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    isActive: initial?.isActive ?? true,
    parent: initial?.parent?._id || initial?.parent || parentId || null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      const payload = { ...form, parent: form.parent || null };
      if (initial?._id) await categoryApi.update(initial._id, payload);
      else await categoryApi.create(payload);
      toast.success(initial ? 'Updated!' : `${parentId ? 'Subcategory' : 'Category'} created!`);
      onSave();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parentName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700">
          <FiFolder className="shrink-0" />
          <span>Under: <strong>{parentName}</strong></span>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {parentId ? 'Subcategory Name' : 'Category Name'} *
        </label>
        <input
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
          placeholder={parentId ? 'e.g. CBC, LFT, MRI...' : 'e.g. Blood Tests, Radiology...'}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          rows={2}
          placeholder="Optional description"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded text-primary-600"
        />
        Active
      </label>
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function SubcategoryRow({ sub, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 group">
      <div className="flex items-center gap-3">
        <div className="w-4 border-l-2 border-b-2 border-gray-200 h-3 ml-2 rounded-bl" />
        <FiTag className="text-gray-400 text-xs" />
        <span className="text-sm text-gray-700">{sub.name}</span>
        {sub.description && <span className="text-xs text-gray-400 hidden sm:inline">— {sub.description}</span>}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
          {sub.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(sub)} className="text-gray-400 hover:text-primary-600 p-1"><FiEdit size={13} /></button>
        <button onClick={() => onDelete(sub)} className="text-gray-400 hover:text-red-500 p-1"><FiTrash2 size={13} /></button>
      </div>
    </div>
  );
}

function CategoryRow({ cat, subcategories, onEdit, onDelete, onAddSub, onEditSub, onDeleteSub }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 group">
        <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-700 transition-colors">
          {open ? <FiChevronDown /> : <FiChevronRight />}
        </button>
        <FiFolder className="text-primary-500" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">{cat.name}</span>
          {cat.description && <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{cat.description}</span>}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {subcategories.length} sub
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
          {cat.isActive ? 'Active' : 'Inactive'}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddSub(cat)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-400 px-2 py-1 rounded-lg transition-colors"
          >
            <FiPlus size={11} /> Sub
          </button>
          <button onClick={() => onEdit(cat)} className="text-gray-400 hover:text-primary-600 p-1.5"><FiEdit size={14} /></button>
          <button onClick={() => onDelete(cat)} className="text-gray-400 hover:text-red-500 p-1.5"><FiTrash2 size={14} /></button>
        </div>
      </div>

      {/* Subcategories */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {subcategories.length === 0 ? (
            <div className="py-3 px-8 text-xs text-gray-400 italic">
              No subcategories yet.{' '}
              <button onClick={() => onAddSub(cat)} className="text-primary-600 hover:underline">Add one</button>
            </div>
          ) : (
            subcategories.map((sub) => (
              <SubcategoryRow
                key={sub._id}
                sub={sub}
                onEdit={onEditSub}
                onDelete={onDeleteSub}
              />
            ))
          )}
          <div className="px-8 py-2">
            <button
              onClick={() => onAddSub(cat)}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <FiPlus size={11} /> Add subcategory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  // modal types: 'addCat' | 'editCat' | 'addSub' | 'editSub'

  const fetchTree = useCallback(() => {
    setLoading(true);
    Promise.all([
      categoryApi.getTopLevel(),
      categoryApi.getAll({ limit: 500 }),
    ]).then(([topRes, allRes]) => {
      const topLevel = topRes.data.items || [];
      const all = allRes.data.items || [];
      const subs = all.filter((c) => c.parent);
      setTree(topLevel);
      setAllSubs(subs);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const getSubsFor = (catId) => allSubs.filter((s) => {
    const pid = s.parent?._id || s.parent;
    return pid?.toString() === catId?.toString();
  });

  const handleDelete = async (cat) => {
    const subs = getSubsFor(cat._id);
    const msg = subs.length > 0
      ? `Delete "${cat.name}" and its ${subs.length} subcategorie(s)? This cannot be undone.`
      : `Delete category "${cat.name}"?`;
    if (!confirm(msg)) return;
    try {
      await categoryApi.delete(cat._id);
      toast.success('Deleted');
      fetchTree();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDeleteSub = async (sub) => {
    if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
    try {
      await categoryApi.delete(sub._id);
      toast.success('Deleted');
      fetchTree();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const closeModal = () => setModal(null);
  const afterSave = () => { closeModal(); fetchTree(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage product categories and subcategories</p>
        </div>
        <button
          onClick={() => setModal({ type: 'addCat' })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <FiPlus /> Add Category
        </button>
      </div>

      {loading ? <PageLoader /> : tree.length === 0 ? (
        <div className="card p-12 text-center">
          <FiFolder className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No categories yet</p>
          <button onClick={() => setModal({ type: 'addCat' })} className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Add First Category
          </button>
        </div>
      ) : (
        <div>
          {tree.map((cat) => (
            <CategoryRow
              key={cat._id}
              cat={cat}
              subcategories={getSubsFor(cat._id)}
              onEdit={(c) => setModal({ type: 'editCat', category: c })}
              onDelete={handleDelete}
              onAddSub={(c) => setModal({ type: 'addSub', parent: c })}
              onEditSub={(s) => setModal({ type: 'editSub', subcategory: s })}
              onDeleteSub={handleDeleteSub}
            />
          ))}
        </div>
      )}

      {/* Add top-level category */}
      <Modal
        open={modal?.type === 'addCat'}
        onClose={closeModal}
        title="Add Category"
      >
        <CategoryForm onSave={afterSave} onClose={closeModal} />
      </Modal>

      {/* Edit top-level category */}
      <Modal
        open={modal?.type === 'editCat'}
        onClose={closeModal}
        title="Edit Category"
      >
        <CategoryForm initial={modal?.category} onSave={afterSave} onClose={closeModal} />
      </Modal>

      {/* Add subcategory */}
      <Modal
        open={modal?.type === 'addSub'}
        onClose={closeModal}
        title="Add Subcategory"
      >
        <CategoryForm
          parentId={modal?.parent?._id}
          parentName={modal?.parent?.name}
          onSave={afterSave}
          onClose={closeModal}
        />
      </Modal>

      {/* Edit subcategory */}
      <Modal
        open={modal?.type === 'editSub'}
        onClose={closeModal}
        title="Edit Subcategory"
      >
        <CategoryForm
          initial={modal?.subcategory}
          parentId={modal?.subcategory?.parent?._id || modal?.subcategory?.parent}
          parentName={tree.find((c) => c._id?.toString() === (modal?.subcategory?.parent?._id || modal?.subcategory?.parent)?.toString())?.name}
          onSave={afterSave}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
}
