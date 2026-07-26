import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Plus, Search, Tag, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export const BrandPage: React.FC = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoId, setLogoId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBrandsAndMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const [brandsRes, mediaRes] = await Promise.all([
        api.get('/brands', { params: { search, status: statusFilter || undefined } }),
        api.get('/media', { params: { type: 'IMAGE' } }),
      ]);
      setBrands(brandsRes.data.brands || []);
      setMediaList(mediaRes.data.media || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandsAndMedia();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingBrandId(null);
    setName('');
    setSlug('');
    setLogoId('');
    setStatus('ACTIVE');
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (brand: any) => {
    setEditingBrandId(brand.id);
    setName(brand.name);
    setSlug(brand.slug);
    setLogoId(brand.logoId || '');
    setStatus(brand.status);
    setDescription(brand.description || '');
    setShowModal(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        slug: slug || undefined,
        logoId: logoId || null,
        status,
        description,
      };

      if (editingBrandId) {
        await api.put(`/brands/${editingBrandId}`, payload);
      } else {
        await api.post('/brands', payload);
      }

      setShowModal(false);
      fetchBrandsAndMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to save brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brand: any) => {
    if (!confirm(`Are you sure you want to delete brand '${brand.name}'?`)) return;

    try {
      await api.delete(`/brands/${brand.id}`);
      fetchBrandsAndMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to delete brand');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Brand Management" subtitle="Product manufacturers and label management" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search brand name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <PermissionGuard permission="brand:create">
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Brand</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Brands Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Brand</th>
                <th className="py-4 px-6">Slug</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Associated Products</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading brands...</td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No brands found.</td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3 font-bold text-slate-900">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {b.logo ? (
                          <img src={b.logo.thumbnail || b.logo.publicUrl} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <Tag className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span>{b.name}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono">/{b.slug}</td>
                    <td className="py-4 px-6 text-slate-500">{b.description || '-'}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{b.productCount || 0} Products</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <PermissionGuard permission="brand:update">
                        <button onClick={() => openEditModal(b)} className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="brand:delete">
                        <button onClick={() => handleDeleteBrand(b)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Brand Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">{editingBrandId ? 'Edit Brand' : 'Create Brand'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apple, Nike, Samsung"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="apple"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Logo Asset from Media</label>
                <select
                  value={logoId}
                  onChange={(e) => setLogoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- No Logo Asset --</option>
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.fileName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brand profile summary..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                  {isSubmitting ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
