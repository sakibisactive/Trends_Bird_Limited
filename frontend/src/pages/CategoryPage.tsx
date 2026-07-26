import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Plus, FolderTree, ChevronRight, Edit2, Trash2, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const [tree, setTree] = useState<any[]>([]);
  const [flatCategories, setFlatCategories] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageId, setImageId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const [treeRes, listRes, mediaRes] = await Promise.all([
        api.get('/categories/tree'),
        api.get('/categories'),
        api.get('/media', { params: { type: 'IMAGE' } }),
      ]);
      setTree(treeRes.data || []);
      setFlatCategories(listRes.data.categories || []);
      setMediaList(mediaRes.data.media || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load category tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCatId(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
    setImageId('');
    setIsActive(true);
    setSortOrder(0);
    setShowModal(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setImageId(cat.imageId || '');
    setIsActive(cat.isActive);
    setSortOrder(cat.sortOrder || 0);
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        slug: slug || undefined,
        description,
        parentId: parentId || null,
        imageId: imageId || null,
        isActive,
        sortOrder: Number(sortOrder),
      };

      if (editingCatId) {
        await api.put(`/categories/${editingCatId}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`Are you sure you want to delete category '${cat.name}'? Subcategories will be reassigned.`)) return;

    try {
      await api.delete(`/categories/${cat.id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  // Recursive Tree Node Component
  const TreeNode: React.FC<{ node: any; depth?: number }> = ({ node, depth = 0 }) => {
    return (
      <div className="space-y-2">
        <div
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-sky-300 transition-colors"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              {node.image ? (
                <img src={node.image.thumbnail || node.image.publicUrl} alt={node.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <FolderTree className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">{node.name}</span>
                <span className="text-[10px] font-mono text-slate-400">/{node.slug}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {node.productCount || 0} Products &bull; Order: {node.sortOrder}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${node.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {node.isActive ? 'Active' : 'Inactive'}
            </span>

            <PermissionGuard permission="category:update">
              <button onClick={() => openEditModal(node)} className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </button>
            </PermissionGuard>

            <PermissionGuard permission="category:delete">
              <button onClick={() => handleDeleteCategory(node)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </PermissionGuard>
          </div>
        </div>

        {/* Children Render */}
        {node.children && node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((child: any) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Category Tree Hierarchy" subtitle="Nested category structure and parent selection" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Category Catalog Hierarchy</h3>
            <p className="text-xs text-slate-500">Unlimited nesting depth tree representation</p>
          </div>

          <PermissionGuard permission="category:create">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Tree Container */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading category hierarchy...
            </div>
          ) : tree.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No categories found.
            </div>
          ) : (
            tree.map((node) => <TreeNode key={node.id} node={node} />)
          )}
        </div>
      </main>

      {/* Category Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingCatId ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Electronics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="smart-electronics"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent Category</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Top Level Category (No Parent) --</option>
                  {flatCategories
                    .filter((c) => c.id !== editingCatId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/{c.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Media Image Asset</label>
                <select
                  value={imageId}
                  onChange={(e) => setImageId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- No Image Asset --</option>
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.fileName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <input
                    type="checkbox"
                    id="catActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-sky-600"
                  />
                  <label htmlFor="catActiveCheck" className="ml-2 font-semibold text-slate-700">
                    Active Category
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
