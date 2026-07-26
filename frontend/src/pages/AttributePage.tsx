import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Plus, Search, Sliders, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export const AttributePage: React.FC = () => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Attribute Modal State
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [attrName, setAttrName] = useState('');
  const [attrSlug, setAttrSlug] = useState('');
  const [attrType, setAttrType] = useState('DROPDOWN');

  // Value Modal State
  const [showValueModal, setShowValueModal] = useState(false);
  const [targetAttrId, setTargetAttrId] = useState<string | null>(null);
  const [valueText, setValueText] = useState('');
  const [refValueHex, setRefValueHex] = useState('#000000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAttributes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attributes', { params: { search } });
      setAttributes(res.data.attributes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, [search]);

  const openCreateAttributeModal = () => {
    setEditingAttrId(null);
    setAttrName('');
    setAttrSlug('');
    setAttrType('DROPDOWN');
    setShowAttributeModal(true);
  };

  const openEditAttributeModal = (attr: any) => {
    setEditingAttrId(attr.id);
    setAttrName(attr.name);
    setAttrSlug(attr.slug);
    setAttrType(attr.type);
    setShowAttributeModal(true);
  };

  const openAddValueModal = (attrId: string) => {
    setTargetAttrId(attrId);
    setValueText('');
    setRefValueHex('#000000');
    setShowValueModal(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attrName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: attrName,
        slug: attrSlug || undefined,
        type: attrType,
      };

      if (editingAttrId) {
        await api.put(`/attributes/${editingAttrId}`, payload);
      } else {
        await api.post('/attributes', payload);
      }

      setShowAttributeModal(false);
      fetchAttributes();
    } catch (err: any) {
      alert(err.message || 'Failed to save attribute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAttrId || !valueText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/attributes/${targetAttrId}/values`, {
        value: valueText,
        referenceValue: refValueHex,
      });

      setShowValueModal(false);
      fetchAttributes();
    } catch (err: any) {
      alert(err.message || 'Failed to add attribute value');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteValue = async (valueId: string, valText: string) => {
    if (!confirm(`Are you sure you want to delete value '${valText}'?`)) return;

    try {
      await api.delete(`/attributes/values/${valueId}`);
      fetchAttributes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete attribute value');
    }
  };

  const handleDeleteAttribute = async (attr: any) => {
    if (!confirm(`Are you sure you want to delete attribute '${attr.name}' and all its values?`)) return;

    try {
      await api.delete(`/attributes/${attr.id}`);
      fetchAttributes();
    } catch (err: any) {
      alert(err.message || 'Failed to delete attribute');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Attribute & Variation Management" subtitle="Product variation dimensions (Colour, Size, Material) and swatches" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search attribute name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <PermissionGuard permission="attribute:create">
            <button
              onClick={openCreateAttributeModal}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Variation Attribute</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Attribute Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">Loading attributes...</div>
          ) : attributes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No variation attributes found.
            </div>
          ) : (
            attributes.map((attr) => (
              <div key={attr.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{attr.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600">
                          {attr.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <PermissionGuard permission="attribute:update">
                        <button onClick={() => openEditAttributeModal(attr)} className="p-1 text-slate-400 hover:text-sky-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="attribute:delete">
                        <button onClick={() => handleDeleteAttribute(attr)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>

                  {/* Values Chip Container */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Attribute Values ({attr.values?.length || 0})
                      </span>
                      <PermissionGuard permission="attribute:create">
                        <button
                          type="button"
                          onClick={() => openAddValueModal(attr.id)}
                          className="text-[11px] font-semibold text-sky-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Value
                        </button>
                      </PermissionGuard>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {attr.values?.map((v: any) => (
                        <div
                          key={v.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 group"
                        >
                          {v.referenceValue && (
                            <span
                              className="w-3 h-3 rounded-full border border-slate-300 inline-block shrink-0"
                              style={{ backgroundColor: v.referenceValue }}
                            />
                          )}
                          <span>{v.value}</span>

                          <PermissionGuard permission="attribute:delete">
                            <button
                              type="button"
                              onClick={() => handleDeleteValue(v.id, v.value)}
                              className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                              title="Delete Value"
                            >
                              &times;
                            </button>
                          </PermissionGuard>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Attribute Create/Edit Modal */}
      {showAttributeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingAttrId ? 'Edit Attribute' : 'Create Variation Attribute'}
              </h3>
              <button onClick={() => setShowAttributeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attribute Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Size, Colour, Storage"
                  value={attrName}
                  onChange={(e) => setAttrName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="color"
                  value={attrSlug}
                  onChange={(e) => setAttrSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Type</label>
                <select
                  value={attrType}
                  onChange={(e) => setAttrType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="DROPDOWN">DROPDOWN (Select Box)</option>
                  <option value="RADIO">RADIO (Button Select)</option>
                  <option value="CHECKBOX">CHECKBOX (Multiple Choice)</option>
                  <option value="COLOUR_SWATCH">COLOUR_SWATCH (Hex Color Swatch)</option>
                  <option value="IMAGE_SWATCH">IMAGE_SWATCH (Media Thumbnail Swatch)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAttributeModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attribute Value Modal */}
      {showValueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Add Attribute Value</h3>
              <button onClick={() => setShowValueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddValue} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Value Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red, XL, 256GB"
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hex Color Reference (For Color Swatch)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={refValueHex}
                    onChange={(e) => setRefValueHex(e.target.value)}
                    className="w-9 h-9 p-0.5 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={refValueHex}
                    onChange={(e) => setRefValueHex(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowValueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold">
                  {isSubmitting ? 'Adding...' : 'Add Value'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
