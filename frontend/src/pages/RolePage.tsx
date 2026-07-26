import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Plus, Search, ShieldCheck, Edit2, Trash2, Check, X, Users, AlertCircle } from 'lucide-react';

export const RolePage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleStatus, setRoleStatus] = useState('ACTIVE');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles', { params: { search } }),
        api.get('/permissions/groups'),
      ]);
      setRoles(rolesRes.data.roles || []);
      setPermissionGroups(permsRes.data.groups || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [search]);

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDesc('');
    setRoleStatus('ACTIVE');
    setSelectedPermissionIds([]);
    setShowModal(true);
  };

  const openEditModal = async (roleId: string) => {
    try {
      const res = await api.get(`/roles/${roleId}`);
      const r = res.data;
      setEditingRoleId(r.id);
      setRoleName(r.name);
      setRoleDesc(r.description || '');
      setRoleStatus(r.status);
      setSelectedPermissionIds(r.permissionIds || []);
      setShowModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch role details');
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const toggleModulePermissions = (group: any) => {
    const groupPermIds = group.permissions.map((p: any) => p.id);
    const allSelected = groupPermIds.every((id: string) => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds(selectedPermissionIds.filter((id) => !groupPermIds.includes(id)));
    } else {
      const merged = new Set([...selectedPermissionIds, ...groupPermIds]);
      setSelectedPermissionIds(Array.from(merged));
    }
  };

  const grantAllPermissions = () => {
    const allIds: string[] = [];
    permissionGroups.forEach((g) => {
      g.permissions?.forEach((p: any) => allIds.push(p.id));
    });
    setSelectedPermissionIds(allIds);
  };

  const clearAllPermissions = () => {
    setSelectedPermissionIds([]);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: roleName,
        description: roleDesc,
        status: roleStatus,
        permissionIds: selectedPermissionIds,
      };

      if (editingRoleId) {
        await api.put(`/roles/${editingRoleId}`, payload);
      } else {
        await api.post('/roles', payload);
      }

      setShowModal(false);
      fetchRolesAndPermissions();
    } catch (err: any) {
      alert(err.message || 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role '${name}'?`)) return;

    try {
      await api.delete(`/roles/${roleId}`);
      fetchRolesAndPermissions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Role Management" subtitle="Bundled permission profiles for user job functions" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <PermissionGuard permission="role:create">
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Role</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Roles Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Role Name</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Assigned Users</th>
                <th className="py-4 px-6">Granted Capabilities</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading roles...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No roles found.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{role.name}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{role.description || '-'}</td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{role.userCount} users</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800">
                        {role.permissions?.length || 0} permissions
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          role.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {role.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <PermissionGuard permission="role:update">
                        <button
                          onClick={() => openEditModal(role.id)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Edit Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>

                      <PermissionGuard permission="role:delete">
                        <button
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Role"
                        >
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

      {/* Role Create/Edit Modal with Permission Matrix Grid */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingRoleId ? 'Edit Role Capabilities' : 'Create New Role Profile'}
                </h3>
                <p className="text-xs text-slate-500">Configure granted permissions across module matrix</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Catalog Manager, Auditor"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={roleStatus}
                    onChange={(e) => setRoleStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of responsibilities"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Shortcuts Toolbar */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-700">
                  Granted Capabilities ({selectedPermissionIds.length} selected)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={grantAllPermissions}
                    className="px-3 py-1.5 bg-sky-600 text-white rounded-md font-semibold text-[11px] hover:bg-sky-700"
                  >
                    Grant All Shortcuts
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] hover:bg-slate-300"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Module-by-Action Matrix Grid */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar border border-slate-200 rounded-xl p-4">
                {permissionGroups.map((group) => {
                  const groupPermIds = group.permissions?.map((p: any) => p.id) || [];
                  const allSelected = groupPermIds.length > 0 && groupPermIds.every((id: string) => selectedPermissionIds.includes(id));

                  return (
                    <div key={group.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 capitalize text-sm">{group.name}</h4>
                          <span className="text-[11px] text-slate-400">({group.permissions?.length || 0} actions)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(group)}
                          className="text-[11px] font-semibold text-sky-600 hover:underline"
                        >
                          {allSelected ? 'Deselect Module' : 'Select All Module'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {group.permissions?.map((p: any) => {
                          const isChecked = selectedPermissionIds.includes(p.id);
                          const actionName = p.name.split(':')[1] || p.name;
                          return (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => togglePermission(p.id)}
                              className={`p-2 rounded-lg border text-left flex items-center justify-between font-mono text-[11px] transition-colors ${
                                isChecked
                                  ? 'bg-sky-500 text-white border-sky-600 font-semibold shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>{actionName}</span>
                              {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                  {isSubmitting ? 'Saving...' : 'Save Role Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
