import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Header } from '../components/Header';
import { Package, Users, Tag, FolderTree, Image as ImageIcon, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err) {
        // Handle metric fetch error
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const stats = [
    {
      name: 'Total Products',
      value: data?.metrics?.totalProducts || 0,
      icon: Package,
      color: 'bg-sky-500 text-sky-500',
      bgColor: 'bg-sky-50 border-sky-100',
      link: '/products',
    },
    {
      name: 'User Accounts',
      value: data?.metrics?.totalUsers || 0,
      icon: Users,
      color: 'bg-purple-500 text-purple-500',
      bgColor: 'bg-purple-50 border-purple-100',
      link: '/users',
    },
    {
      name: 'Active Brands',
      value: data?.metrics?.totalBrands || 0,
      icon: Tag,
      color: 'bg-emerald-500 text-emerald-500',
      bgColor: 'bg-emerald-50 border-emerald-100',
      link: '/brands',
    },
    {
      name: 'Categories',
      value: data?.metrics?.totalCategories || 0,
      icon: FolderTree,
      color: 'bg-amber-500 text-amber-500',
      bgColor: 'bg-amber-50 border-amber-100',
      link: '/categories',
    },
    {
      name: 'Media Assets',
      value: data?.metrics?.totalMedia || 0,
      icon: ImageIcon,
      color: 'bg-rose-500 text-rose-500',
      bgColor: 'bg-rose-50 border-rose-100',
      link: '/media',
    },
  ];

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <Header title="Dashboard Overview" subtitle="System metrics and catalog summary" />

      <main className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.name}
                to={stat.link}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} border`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{stat.name}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Recently Added Products</h3>
              <p className="text-xs text-slate-500">Latest catalog items in system</p>
            </div>
            <Link
              to="/products"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All Products &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">SKU</th>
                  <th className="py-3.5 px-6">Brand</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading dashboard data...
                    </td>
                  </tr>
                ) : data?.recentProducts?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  data?.recentProducts?.map((product: any) => (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {product.thumbnail ? (
                            <img src={product.thumbnail.publicUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-900">{product.name}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500">{product.sku}</td>
                      <td className="py-4 px-6">{product.brand?.name || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${product.hasVariants ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                          {product.hasVariants ? 'Variable' : 'Simple'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {product.hasVariants ? 'Price Range' : `$${product.price}`}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
