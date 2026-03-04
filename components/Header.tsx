
import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick }) => {
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
          <h1 className="text-xl font-bold tracking-tight text-slate-800">SpiritFeed <span className="text-indigo-500">AI</span></h1>
        </div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium text-slate-500">
          <button onClick={onHomeClick} className="hover:text-indigo-600">ホーム</button>
          <span className="hover:text-indigo-600 cursor-not-allowed opacity-50">テンプレート</span>
          <span className="hover:text-indigo-600 cursor-not-allowed opacity-50">設定</span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
