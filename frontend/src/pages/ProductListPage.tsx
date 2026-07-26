import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { PermissionGuard } from '../components/PermissionGuard';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, Edit2, Trash2, Tag, FolderTree, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProductsAndFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        api.get('/products', {
          params: {
            search,
            brandId: brandFilter || undefined,
            categoryId: categoryFilter || undefined,
            page,
            limit: 10,
          },
        }),
        api.get('/brands'),
        api.get('/categories'),
      ]);

      setProducts(productsRes.data.products || []);
      setPagination(productsRes.data.pagination);
      setBrands(brandsRes.data.brands || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndFilters();
  }, [search, brandFilter, categoryFilter, page]);

  const handleDeleteProduct = async (product: any) => {
    if (!confirm(`Are you sure you want to delete product '${product.name}'? Shared media files will be preserved.`)) return;

    try {
      await api.delete(`/products/${product.id}`);
      fetchProductsAndFilters();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Product Catalog Management" subtitle="Manage simple and variable products, pricing, stock, and media" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <PermissionGuard permission="product:create">
            <Link
              to="/products/new"
              className="w-full md:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Product</span>
            </Link>
          </PermissionGuard>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Product Item</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6">Brand</th>
                <th className="py-4 px-6">Categories</th>
                <th className="py-4 px-6">Type & Price</th>
                <th className="py-4 px-6">Stock</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading product catalog...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No products found.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3 font-bold text-slate-900">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {p.thumbnail ? (
                          <img src={p.thumbnail.publicUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/{p.slug}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">{p.sku}</td>
                    <td className="py-4 px-6">{p.brand?.name || '-'}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {p.categoryList?.map((c: any) => (
                          <span key={c.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px]">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.hasVariants ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                          {p.hasVariants ? `${p.variants?.length || 0} Variants` : 'Simple'}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">{p.priceDisplay}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {!p.hasVariants ? (
                        <span className={`font-semibold ${p.stock > 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                          {p.stock} units
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">On Variants</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <PermissionGuard permission="product:update">
                        <Link to={`/products/edit/${p.id}`} className="p-1.5 inline-block text-slate-400 hover:text-sky-600 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      </PermissionGuard>
                      <PermissionGuard permission="product:delete">
                        <button onClick={() => handleDeleteProduct(p)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total products)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold bg-white disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold bg-white disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
