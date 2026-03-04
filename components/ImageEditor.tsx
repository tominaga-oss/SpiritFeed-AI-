
import React, { useState, useEffect } from 'react';
import { BlogContent, BackgroundTheme } from '../types';
import { ArrowLeft, Check, Image as ImageIcon, Sparkles, Cloud, TreePine, Landmark, Edit3, AlignLeft, Layout, Grid, Type, Palette } from 'lucide-react';

interface ImageEditorProps {
  content: BlogContent;
  onConfirm: (theme: BackgroundTheme, brightness: 'bright' | 'dark') => void;
  onUpdateContent: (content: BlogContent) => void;
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ content, onConfirm, onUpdateContent, onBack }) => {
  const [selectedTheme, setSelectedTheme] = useState<BackgroundTheme>('random');
  const [selectedBrightness, setSelectedBrightness] = useState<'bright' | 'dark'>('bright');
  const [localContent, setLocalContent] = useState<BlogContent>(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (field: keyof BlogContent, value: any) => {
    const updated = { ...localContent, [field]: value };
    setLocalContent(updated);
    onUpdateContent(updated);
  };

  const themes: { id: BackgroundTheme; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'random', label: 'おまかせ', icon: <Sparkles className="w-4 h-4" />, color: 'bg-indigo-500' },
    { id: 'shrine', label: '鳥居・神社', icon: <Landmark className="w-4 h-4" />, color: 'bg-red-600' },
    { id: 'temple', label: '寺院・石畳', icon: <Layout className="w-4 h-4" />, color: 'bg-slate-700' },
    { id: 'sky', label: '宇宙・星空', icon: <Cloud className="w-4 h-4" />, color: 'bg-blue-900' },
    { id: 'forest', label: '深い森', icon: <TreePine className="w-4 h-4" />, color: 'bg-emerald-800' },
  ];

  const colors = [
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'White', hex: '#ffffff' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-bold">
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </button>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          <Edit3 className="w-3 h-3 mr-1" />
          デザイン構成の編集
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
            
            <div className="space-y-4">
               <h3 className="text-lg font-black text-slate-800 flex items-center">
                 <Grid className="w-5 h-5 mr-2 text-indigo-500" />
                 表紙デザインの選択
               </h3>
               <div className="grid grid-cols-4 gap-4">
                 {[1, 2, 3, 4].map(p => (
                   <button 
                     key={p}
                     onClick={() => handleChange('coverPattern', p)}
                     className={`aspect-[4/5] rounded-xl border-4 transition-all flex flex-col items-center justify-center p-2 text-xs font-bold ${
                       localContent.coverPattern === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                     }`}
                   >
                     <span>パターン {p}</span>
                   </button>
                 ))}
               </div>
            </div>

            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-black text-indigo-600">テキスト編集</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">表紙メインタイトル（3行）</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base font-black"
                    value={localContent.coverMainTitle}
                    onChange={(e) => handleChange('coverMainTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">表紙サブタイトル（フック）</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold"
                    value={localContent.coverHookBox}
                    onChange={(e) => handleChange('coverHookBox', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">本編（ダブル改行でスライドを分け、[[キーワード]] で強調）</label>
                  <textarea
                    rows={12}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold text-slate-700 whitespace-pre-wrap font-serif"
                    value={localContent.body}
                    onChange={(e) => handleChange('body', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center uppercase tracking-widest">
                <Type className="w-4 h-4 mr-2 text-indigo-500" />
                本文レイアウト
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => handleChange('bodyLayout', 'horizontal')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${localContent.bodyLayout === 'horizontal' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                >
                  横書き
                </button>
                <button 
                  onClick={() => handleChange('bodyLayout', 'vertical')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${localContent.bodyLayout === 'vertical' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                >
                  縦書き
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center uppercase tracking-widest">
                <Palette className="w-4 h-4 mr-2 text-indigo-500" />
                強調カラー
              </h3>
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => handleChange('accentColor', c.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${localContent.accentColor === c.hex ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center uppercase tracking-widest">
                <ImageIcon className="w-4 h-4 mr-2 text-indigo-500" />
                背景テーマ
              </h3>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase">明るさ設定</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setSelectedBrightness('bright')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedBrightness === 'bright' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                  >
                    明るい
                  </button>
                  <button 
                    onClick={() => setSelectedBrightness('dark')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedBrightness === 'dark' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                  >
                    暗い
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative p-2.5 rounded-xl border transition-all flex items-center space-x-3 text-left ${
                      selectedTheme === theme.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`p-1.5 rounded text-white ${theme.color}`}>{theme.icon}</div>
                    <span className="text-xs font-black">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onConfirm(selectedTheme, selectedBrightness)}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
              プレビュー生成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
