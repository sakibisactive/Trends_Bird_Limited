import React, { useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User as UserIcon, Menu } from 'lucide-react';
import { MobileLayoutContext } from '../App';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  const { toggleMobileMenu } = useContext(MobileLayoutContext);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
          {subtitle && <p className="text-[11px] md:text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">{user?.role?.name}</span>
        </div>

        <div className="flex items-center gap-2.5 sm:pl-2 sm:border-l border-slate-200">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs border border-sky-200">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
