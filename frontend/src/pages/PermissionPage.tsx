import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Plus, Search, KeyRound, Check, X, Trash2, AlertCircle } from 'lucide-react';

export const PermissionPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>(['watch', 'read', 'create', 'update', 'delete']);
  const [customActionInput, setCustomActionInput] = useState('');
  const [customActions, setCustomActions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const standardActions = ['watch', 'read', 'create', 'update', 'delete', 'upload', 'write', 'approve'];

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/permissions/groups', {
        params: { search },
      });
      setGroups(res.data.groups || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [search]);

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    );
  };

  const addCustomAction = () => {
    if (!customActionInput.trim()) return;
    const action = customActionInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!customActions.includes(action)) {
      setCustomActions([...customActions, action]);
    }
    setCustomActionInput('');
  };

  const removeCustomAction = (action: string) => {
    setCustomActions(customActions.filter((a) => a !== action));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/permissions/groups', {
        name: groupName,
        description: groupDesc,
        actions: selectedActions,
        customActions: customActions,
      });

      setShowModal(false);
      setGroupName('');
      setGroupDesc('');
      setCustomActions([]);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to create permission group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete permission group '${name}' and all its actions?`)) return;

    try {
      await api.delete(`/permissions/groups/${groupId}`);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to delete permission group');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Permission Management" subtitle="System capability vocabulary grouped by module" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search permission groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <PermissionGuard permission="permission:create">
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Permission Group</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Permission Module-by-Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium">
              Loading permission groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
              No permission groups found.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 capitalize text-sm">{group.name}</h3>
                        <p className="text-[11px] text-slate-400">{group.description || 'Module permission group'}</p>
                      </div>
                    </div>

                    <PermissionGuard permission="permission:delete">
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                  </div>

                  {/* Actions Chips */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Registered Actions ({group.permissions?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions?.map((p: any) => {
                        const actionName = p.name.split(':')[1] || p.name;
                        return (
                          <span
                            key={p.id}
                            className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-mono font-medium"
                          >
                            {actionName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Permission Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Create Permission Group</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Module Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. coupon, shipping, order"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Module capability description"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Standard Action Capabilities</label>
                <div className="grid grid-cols-2 gap-2">
                  {standardActions.map((action) => {
                    const isChecked = selectedActions.includes(action);
                    return (
                      <button
                        type="button"
                        key={action}
                        onClick={() => toggleAction(action)}
                        className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between font-mono text-xs transition-colors ${
                          isChecked
                            ? 'bg-sky-50 border-sky-300 text-sky-700 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{action}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Action Addition */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Custom Action</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. approve, publish, refund"
                    value={customActionInput}
                    onChange={(e) => setCustomActionInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={addCustomAction}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-semibold"
                  >
                    Add
                  </button>
                </div>

                {customActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {customActions.map((ca) => (
                      <span key={ca} className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-mono flex items-center gap-1">
                        {ca}
                        <button type="button" onClick={() => removeCustomAction(ca)} className="hover:text-purple-900">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 shadow-md shadow-sky-600/20"
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
