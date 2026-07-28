
import React, { useState, useEffect, useRef } from 'react';
import { BlogContent, BackgroundTheme } from '../types';
import { ArrowLeft, Check, Image as ImageIcon, Sparkles, Cloud, TreePine, Landmark, Edit3, AlignLeft, Layout, Grid, Type, Palette, Upload, Wand2, Type as TypeIcon } from 'lucide-react';

interface ImageEditorProps {
  content: BlogContent;
  initialTheme?: BackgroundTheme;
  initialBrightness?: 'bright' | 'dark';
  initialCustomImage?: string | null;
  onConfirm: (theme: BackgroundTheme, brightness: 'bright' | 'dark', customImage?: string | null) => void;
  onUpdateContent: (content: BlogContent) => void;
  onBack: () => void;
  onThemeChange?: (theme: BackgroundTheme) => void;
  onBrightnessChange?: (brightness: 'bright' | 'dark') => void;
  onCustomImageChange?: (customImage: string | null) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  content, 
  initialTheme, 
  initialBrightness, 
  initialCustomImage, 
  onConfirm, 
  onUpdateContent, 
  onBack,
  onThemeChange,
  onBrightnessChange,
  onCustomImageChange
}) => {
  const [selectedTheme, setSelectedTheme] = useState<BackgroundTheme>(initialTheme || 'random');
  const [selectedBrightness, setSelectedBrightness] = useState<'bright' | 'dark'>(initialBrightness || 'bright');
  const [localContent, setLocalContent] = useState<BlogContent>(content);
  const [customImage, setCustomImage] = useState<string | null>(initialCustomImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalContent(content);
    // Initialize titleStyle if not present
    if (!content.titleStyle) {
      handleChange('titleStyle', {
        fontSize: 40,
        fontFamily: 'Shippori Mincho',
        effect: 'shadow',
        color: '#ffffff'
      });
    }
  }, [content]);

  const handleChange = (field: keyof BlogContent, value: any) => {
    const updated = { ...localContent, [field]: value };
    setLocalContent(updated);
    onUpdateContent(updated);
  };

  const handleTitleStyleChange = (key: string, value: any) => {
    const currentStyle = localContent.titleStyle || {
      fontSize: 40,
      fontFamily: 'Shippori Mincho',
      effect: 'shadow',
      color: '#ffffff'
    };
    handleChange('titleStyle', { ...currentStyle, [key]: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomImage(base64);
        setSelectedTheme('custom');
        if (onCustomImageChange) onCustomImageChange(base64);
        if (onThemeChange) onThemeChange('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const themes: { id: BackgroundTheme; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'random', label: 'おまかせ', icon: <Sparkles className="w-4 h-4" />, color: 'bg-indigo-500' },
    { id: 'shrine', label: '鳥居・神社', icon: <Landmark className="w-4 h-4" />, color: 'bg-red-600' },
    { id: 'temple', label: '寺院・石畳', icon: <Layout className="w-4 h-4" />, color: 'bg-slate-700' },
    { id: 'sky', label: '宇宙・星空', icon: <Cloud className="w-4 h-4" />, color: 'bg-blue-900' },
    { id: 'forest', label: '深い森', icon: <TreePine className="w-4 h-4" />, color: 'bg-emerald-800' },
    { id: 'custom', label: '自分の画像', icon: <Upload className="w-4 h-4" />, color: 'bg-amber-500' },
  ];

  const fonts = [
    { id: 'Shippori Mincho', label: 'しっぽり明朝' },
    { id: 'Noto Serif JP', label: '源ノ明朝' },
    { id: 'Dela Gothic One', label: 'デラゴシック' },
    { id: 'Hina Mincho', label: 'ひな明朝' },
    { id: 'Kaisei Tokumin', label: '解星 特ミン' },
    { id: 'sans-serif', label: 'ゴシック体' },
  ];

  const effects = [
    { id: 'none', label: 'なし' },
    { id: 'shadow', label: '影' },
    { id: 'outline', label: '縁取り' },
    { id: 'neon', label: 'ネオン' },
  ];

  const colors = [
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#000000' },
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

            <div className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-indigo-600 uppercase tracking-wider">タイトルデザイン設定</h4>
                <Wand2 className="w-4 h-4 text-indigo-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">フォント</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    value={localContent.titleStyle?.fontFamily || 'SoukouMincho'}
                    onChange={(e) => handleTitleStyleChange('fontFamily', e.target.value)}
                  >
                    {fonts.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">サイズ</label>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="range" min="20" max="80" 
                      className="flex-1 accent-indigo-600"
                      value={localContent.titleStyle?.fontSize || 40}
                      onChange={(e) => handleTitleStyleChange('fontSize', parseInt(e.target.value))}
                    />
                    <span className="text-xs font-black text-slate-600 w-8">{localContent.titleStyle?.fontSize || 40}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">エフェクト</label>
                  <div className="flex flex-wrap gap-2">
                    {effects.map(eff => (
                      <button
                        key={eff.id}
                        onClick={() => handleTitleStyleChange('effect', eff.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          (localContent.titleStyle?.effect || 'shadow') === eff.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        {eff.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">文字色</label>
                  <div className="flex gap-2">
                    {colors.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => handleTitleStyleChange('color', c.hex)}
                        className={`w-6 h-6 rounded-full border transition-all ${localContent.titleStyle?.color === c.hex ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border-slate-200'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-black text-indigo-600 uppercase tracking-wider">テキスト編集</h4>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">表紙メインタイトル</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base font-black"
                    value={localContent.coverMainTitle}
                    onChange={(e) => handleChange('coverMainTitle', e.target.value)}
                    placeholder="表紙のタイトルを入力..."
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-1">※記事タイトルを元に、より惹きつける言葉に編集してください</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase">本編（ダブル改行でスライドを分け、[[キーワード]] で強調）</label>
                    <div className="flex items-center space-x-3 text-[10px] font-black">
                      <span className="text-indigo-500">
                        {localContent.body.split(/\n\n+/).filter(s => s.trim()).length} 枚
                      </span>
                      <span className={`${localContent.body.length > 1000 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {localContent.body.length} 文字
                      </span>
                      <span className={`${localContent.body.split('\n').length > 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {localContent.body.split('\n').length} 行
                      </span>
                    </div>
                  </div>
                  <div className="relative group">
                    <textarea
                      rows={12}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold text-slate-700 whitespace-pre-wrap font-mono tracking-wider"
                      style={{ 
                        lineHeight: '1.6',
                      }}
                      value={localContent.body}
                      onChange={(e) => handleChange('body', e.target.value)}
                      placeholder="ここに文章を入力してください..."
                    />
                  </div>
                  <div className="bg-slate-100/50 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-black flex items-center">
                        <Layout className="w-3 h-3 mr-1" />
                        レイアウト別推奨文字数
                      </p>
                      <p className="text-[10px] text-indigo-600 font-black">
                        現在の設定：{localContent.bodyLayout === 'vertical' ? '縦書き' : '横書き'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-2 rounded-lg border ${localContent.bodyLayout === 'horizontal' ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-slate-200 opacity-60'}`}>
                        <p className="text-[9px] font-black text-slate-400 mb-1">横書き推奨</p>
                        <p className="text-[10px] font-bold text-slate-700">1行 18〜22文字</p>
                        <p className="text-[10px] font-bold text-slate-700">1枚 5〜7行</p>
                      </div>
                      <div className={`p-2 rounded-lg border ${localContent.bodyLayout === 'vertical' ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-slate-200 opacity-60'}`}>
                        <p className="text-[9px] font-black text-slate-400 mb-1">縦書き推奨</p>
                        <p className="text-[10px] font-bold text-slate-700">1行 14〜16文字</p>
                        <p className="text-[10px] font-bold text-slate-700">1枚 6〜8行</p>
                      </div>
                    </div>
                    {localContent.body.split(/\n\n+/).some(s => s.split('\n').length > 8) && (
                      <p className="text-[9px] text-rose-500 font-black animate-pulse">
                        ⚠️ 1枚の行数が多すぎるスライドがあります（推奨 8行以内）。
                      </p>
                    )}
                    {localContent.body.split('\n').some(line => line.length > (localContent.bodyLayout === 'vertical' ? 14 : 18)) && (
                      <p className="text-[9px] text-rose-500 font-black animate-pulse">
                        ⚠️ 1行の文字数が多すぎる箇所があります（{localContent.bodyLayout === 'vertical' ? '14' : '18'}文字以内で改行推奨）。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center uppercase tracking-widest">
                <TypeIcon className="w-4 h-4 mr-2 text-indigo-500" />
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
                    onClick={() => {
                      setSelectedBrightness('bright');
                      if (onBrightnessChange) onBrightnessChange('bright');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedBrightness === 'bright' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                  >
                    明るい
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedBrightness('dark');
                      if (onBrightnessChange) onBrightnessChange('dark');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedBrightness === 'dark' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                  >
                    暗い
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {themes.map((theme) => (
                  <div key={theme.id} className="relative group">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        if (onThemeChange) onThemeChange(theme.id);
                        if (theme.id === 'custom' && !customImage) {
                          fileInputRef.current?.click();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedTheme(theme.id);
                          if (onThemeChange) onThemeChange(theme.id);
                          if (theme.id === 'custom' && !customImage) {
                            fileInputRef.current?.click();
                          }
                        }
                      }}
                      className={`w-full relative p-2.5 rounded-xl border transition-all flex items-center space-x-3 text-left cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 ${
                        selectedTheme === theme.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className={`p-1.5 rounded text-white ${theme.color}`}>{theme.icon}</div>
                      <div className="flex-1">
                        <span className="text-xs font-black block">{theme.label}</span>
                        {theme.id === 'custom' && customImage && (
                          <span className="text-[9px] text-indigo-500 font-bold">画像アップロード済み</span>
                        )}
                      </div>
                      {theme.id === 'custom' && customImage && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="p-1 hover:bg-indigo-100 rounded text-indigo-500"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <button
              onClick={() => onConfirm(selectedTheme, selectedBrightness, customImage)}
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
