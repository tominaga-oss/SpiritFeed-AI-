
import React from 'react';
import { BlogContent } from '../types';
import { ArrowLeft, CheckCircle, Quote, Sparkles, BookOpen, Heart, GraduationCap, History } from 'lucide-react';

interface PatternSelectorProps {
  patterns: BlogContent[];
  onSelect: (index: number) => void;
  onBack: () => void;
}

const PatternSelector: React.FC<PatternSelectorProps> = ({ patterns, onSelect, onBack }) => {
  const getIcon = (label: string) => {
    if (label.includes('共感')) return <Heart className="w-5 h-5" />;
    if (label.includes('実践') || label.includes('メソッド')) return <BookOpen className="w-5 h-5" />;
    if (label.includes('教師')) return <GraduationCap className="w-5 h-5" />;
    if (label.includes('ストーリー') || label.includes('ブログ')) return <History className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  const getStyleClass = (label: string) => {
    if (label.includes('共感')) return 'border-pink-100 hover:border-pink-400 bg-pink-50/30';
    if (label.includes('実践') || label.includes('メソッド')) return 'border-blue-100 hover:border-blue-400 bg-blue-50/30';
    if (label.includes('教師')) return 'border-amber-100 hover:border-amber-400 bg-amber-50/30';
    if (label.includes('ストーリー') || label.includes('ブログ')) return 'border-emerald-100 hover:border-emerald-400 bg-emerald-50/30';
    return 'border-indigo-100 hover:border-indigo-400 bg-indigo-50/30';
  };

  const getTagClass = (label: string) => {
    if (label.includes('共感')) return 'bg-pink-100 text-pink-600';
    if (label.includes('実践') || label.includes('メソッド')) return 'bg-blue-100 text-blue-600';
    if (label.includes('教師')) return 'bg-amber-100 text-amber-600';
    if (label.includes('ストーリー') || label.includes('ブログ')) return 'bg-emerald-100 text-emerald-600';
    return 'bg-indigo-100 text-indigo-600';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          タイトルを考え直す
        </button>
        <h2 className="text-2xl font-bold text-slate-800">最適なアプローチを選択</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {patterns.map((pattern, index) => (
          <div 
            key={index}
            className={`group relative flex flex-col p-6 rounded-3xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden ${getStyleClass(pattern.styleLabel)}`}
            onClick={() => onSelect(index)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${getTagClass(pattern.styleLabel)}`}>
                {getIcon(pattern.styleLabel)}
                <span>{pattern.styleLabel}</span>
              </span>
              <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-3 leading-tight group-hover:text-indigo-600 transition-colors">
              {pattern.title}
            </h3>

            <div className="flex-1 overflow-hidden relative">
              <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap font-serif opacity-70 group-hover:opacity-100 transition-opacity max-h-40 overflow-hidden">
                <Quote className="w-8 h-8 text-slate-100 absolute -top-1 -left-2 -z-10" />
                {pattern.body.substring(0, 300)}...
              </div>
              <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold">{pattern.body.length} 文字</span>
              <button className="text-xs font-bold text-indigo-600 flex items-center group-hover:translate-x-1 transition-transform">
                このパターンで編集
                <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center p-6 bg-white rounded-2xl border border-slate-100">
        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          あなたのブランドイメージに最も近いパターンを選んでください。<br />
          次のステップで、文章の微調整やデザインの変更が可能です。
        </p>
      </div>
    </div>
  );
};

export default PatternSelector;
