import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  KeyRound,
  ShieldAlert,
  Users,
  FolderTree,
  Tag,
  Sliders,
  Package,
  Image as ImageIcon,
  LogOut,
  Bird,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  module: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Permissions', path: '/permissions', icon: KeyRound, module: 'permission' },
  { name: 'Roles', path: '/roles', icon: ShieldAlert, module: 'role' },
  { name: 'Users', path: '/users', icon: Users, module: 'user' },
  { name: 'Media Library', path: '/media', icon: ImageIcon, module: 'media' },
  { name: 'Categories', path: '/categories', icon: FolderTree, module: 'category' },
  { name: 'Brands', path: '/brands', icon: Tag, module: 'brand' },
  { name: 'Attributes', path: '/attributes', icon: Sliders, module: 'attribute' },
  { name: 'Products', path: '/products', icon: Package, module: 'product' },
];

export const Sidebar: React.FC = () => {
  const { canWatch, logout, user } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 select-none">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
          <Bird className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-sm">TRENDS BIRD</h1>
          <p className="text-[10px] text-slate-400 font-medium">Ecommerce Admin</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 custom-scrollbar overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-3">
          Modules & Catalog
        </p>

        {navItems.map((item) => {
          const isAllowed = canWatch(item.module);
          if (!isAllowed) return null;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-sky-400 border border-slate-700/60">
                {user?.role?.name || 'User'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
