
import React from 'react';
import { Sparkles, LogOut, User } from 'lucide-react';

interface HeaderProps {
  user: any;
  onHomeClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onHomeClick, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer group"
          onClick={onHomeClick}
        >
          <div className="bg-indigo-500 p-2 rounded-lg group-hover:bg-indigo-600 transition-colors">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">スピリチュアルブログ作成<span className="text-indigo-500">AI</span></h1>
        </div>
        <nav className="flex items-center space-x-4">
          <div className="hidden md:flex items-center mr-4 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 tracking-wider">ONLINE: {user?.email || 'ANONYMOUS'}</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center text-xs font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
