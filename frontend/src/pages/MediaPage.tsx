import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Upload, Search, Image as ImageIcon, Video, FileText, Trash2, Edit2, X, AlertCircle, Loader2 } from 'lucide-react';

export const MediaPage: React.FC = () => {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Modal State
  const [editingMedia, setEditingMedia] = useState<any | null>(null);
  const [altText, setAltText] = useState('');
  const [title, setTitle] = useState('');

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/media', {
        params: {
          search,
          type: typeFilter || undefined,
        },
      });
      setMediaList(res.data.media || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load media assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [search, typeFilter]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowUploadModal(false);
      setSelectedFiles(null);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (media: any) => {
    setEditingMedia(media);
    setAltText(media.altText || '');
    setTitle(media.title || '');
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;

    try {
      await api.patch(`/media/${editingMedia.id}`, { altText, title });
      setEditingMedia(null);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to update media metadata');
    }
  };

  const handleDeleteMedia = async (media: any) => {
    if (!confirm(`Are you sure you want to delete media asset '${media.fileName}'?`)) return;

    try {
      await api.delete(`/media/${media.id}`);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to delete media asset');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Shared Media Library" subtitle="Uploaded files, thumbnails, and media attachments" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search file name or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Types</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>

          <PermissionGuard permission="media:upload">
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Media</span>
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Media Assets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">Loading media library...</div>
          ) : mediaList.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No media files found.
            </div>
          ) : (
            mediaList.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                {/* Thumbnail Preview Area */}
                <div className="h-36 bg-slate-100 relative flex items-center justify-center overflow-hidden">
                  {m.type === 'IMAGE' ? (
                    <img src={m.thumbnail || m.publicUrl} alt={m.altText || m.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : m.type === 'VIDEO' ? (
                    <Video className="w-8 h-8 text-slate-400" />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-400" />
                  )}

                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-slate-900/70 text-white rounded text-[10px] font-mono backdrop-blur">
                    {formatFileSize(m.size)}
                  </span>
                </div>

                {/* Info Footer */}
                <div className="p-3 bg-white space-y-1">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={m.title || m.fileName}>
                    {m.title || m.fileName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{m.width && m.height ? `${m.width}x${m.height}` : m.type}</span>

                    <div className="flex items-center gap-1">
                      <PermissionGuard permission="media:write">
                        <button onClick={() => openEditModal(m)} className="p-1 hover:text-sky-600" title="Edit Metadata">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="media:delete">
                        <button onClick={() => handleDeleteMedia(m)} className="p-1 hover:text-rose-600" title="Delete Asset">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Upload Shared Media</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <Upload className="w-8 h-8 text-sky-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Choose images or files to upload</p>
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP, MP4, PDF up to 15MB</p>
                <input
                  type="file"
                  multiple
                  required
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 shadow-md shadow-sky-600/20 flex items-center gap-1.5"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Uploading...' : 'Start Upload'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit Asset Metadata</h3>
              <button onClick={() => setEditingMedia(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
