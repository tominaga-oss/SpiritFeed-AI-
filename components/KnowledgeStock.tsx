
import React, { useState } from 'react';
import { Source } from '../types';
import { Database, Trash2, ExternalLink, Calendar, Instagram, FileText, Plus, X, RefreshCcw, Globe, Sparkles, Clock } from 'lucide-react';

interface KnowledgeStockProps {
  sources: Source[];
  drafts: any[];
  activeTab: 'sources' | 'drafts';
  onTabChange: (tab: 'sources' | 'drafts') => void;
  selectedIds: string[];
  selectedDraftIds?: string[];
  onAdd: (source: Source) => void;
  onToggle: (id: string) => void;
  onToggleDraft?: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveDraft: (id: string) => void;
  onSelectDraft: (draft: any) => void;
  onRegisterStyleReference?: (source: Source) => void;
  onRefreshTitle?: (id: string) => void;
}

const KnowledgeStock: React.FC<KnowledgeStockProps> = ({ 
  sources, 
  drafts = [],
  activeTab,
  onTabChange,
  selectedIds, 
  selectedDraftIds = [],
  onAdd, 
  onToggle, 
  onToggleDraft,
  onRemove, 
  onRemoveDraft,
  onSelectDraft,
  onRegisterStyleReference,
  onRefreshTitle 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleManualAdd = () => {
    if (!newName.trim() || !newContent.trim()) return;

    const source: Source = {
      id: Math.random().toString(36).substring(7),
      name: newName,
      content: newContent,
      type: 'text',
      createdAt: Date.now()
    };

    onAdd(source);
    setNewName('');
    setNewContent('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 tracking-tight">ライブラリ</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Stock & Drafts</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`p-2 rounded-xl transition-all ${isAdding ? 'bg-rose-100 text-rose-600 rotate-45' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => onTabChange('sources')}
          className={`flex-1 py-3 text-xs font-black transition-all ${activeTab === 'sources' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          メインDB (記述内容)
        </button>
        <button 
          onClick={() => onTabChange('drafts')}
          className={`flex-1 py-3 text-xs font-black transition-all ${activeTab === 'drafts' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          マザーDB (型・言い回し)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {activeTab === 'sources' ? (
          <>
            {isAdding && (
              <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3 animate-in slide-in-from-top-2">
                <input 
                  type="text"
                  placeholder="知識のタイトル (例: 宇宙の法則について)"
                  className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <textarea 
                  placeholder="知識の内容を入力してください..."
                  className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                  >
                    キャンセル
                  </button>
                  <button 
                    onClick={handleManualAdd}
                    disabled={!newName.trim() || !newContent.trim()}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 disabled:opacity-50"
                  >
                    ストックに追加
                  </button>
                </div>
              </div>
            )}
            
            {sources.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Database className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">ストックがありません。</p>
              </div>
            ) : (
              sources.map((source) => {
                const isSelected = selectedIds.includes(source.id);
                return (
                  <div 
                    key={source.id} 
                    className={`p-4 transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-indigo-50/50 border-indigo-500' : 'hover:bg-slate-50 border-transparent'}`}
                    onClick={() => onToggle(source.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex items-center">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <div className="mt-1">
                          {source.type === 'instagram' ? <Instagram className="w-4 h-4 text-pink-500" /> : <FileText className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className={`text-sm font-bold leading-tight transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {source.name}
                          </h4>
                          <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(source.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {source.content}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <button onClick={(e) => { e.stopPropagation(); setViewingSource(source); }} className="text-[10px] font-bold text-indigo-600">詳細</button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRegisterStyleReference?.(source); 
                              }} 
                              className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                            >
                              お手本(マザーDB)として登録
                            </button>
                            {source.type === 'instagram' && onRefreshTitle && (
                              <button onClick={(e) => { e.stopPropagation(); onRefreshTitle(source.id); }} className="text-[10px] font-bold text-slate-400">タイトル更新</button>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`「${source.name}」をライブラリから削除しますか？\n削除すると復旧できません。`)) {
                            onRemove(source.id); 
                          }
                        }} 
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            {drafts.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">下書きがありません。</p>
              </div>
            ) : (
              drafts.map((draft) => {
                const isSelected = selectedDraftIds.includes(draft.id);
                return (
                  <div 
                    key={draft.id} 
                    className={`p-4 transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-indigo-50/50 border-indigo-500' : 'hover:bg-slate-50 border-transparent'}`}
                    onClick={() => onToggleDraft?.(draft.id)}
                  >
                     <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex items-center">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <div className="mt-1">
                          <FileText className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className={`text-sm font-bold leading-tight transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {draft.title}
                          </h4>
                          <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(draft.createdAt || Date.now()).toLocaleDateString()}</span>
                            <span className="text-indigo-500 font-bold">{draft.styleLabel || 'ドラフト'}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {((draft.body || draft.content || '') as string).substring(0, 80)}...
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <button onClick={(e) => { e.stopPropagation(); onSelectDraft(draft); }} className="text-[10px] font-bold text-indigo-600">プレビュー / 編集</button>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`「${draft.title}」をライブラリから削除しますか？\n削除すると復旧できません。`)) {
                            onRemoveDraft(draft.id); 
                          }
                        }} 
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-bold">
          ※ これらのストックはAIが記事を生成する際の「独自の知識」として活用されます。
        </p>
      </div>

      {/* Detail Modal */}
      {viewingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${
                  viewingSource.type === 'instagram' ? 'bg-pink-100 text-pink-600' : 
                  viewingSource.type === 'blog' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  {viewingSource.type === 'instagram' ? <Instagram className="w-5 h-5" /> : 
                   viewingSource.type === 'blog' ? <Globe className="w-5 h-5" /> :
                   <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight">{viewingSource.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Source Details & Transcription</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingSource(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              <div className="space-y-6">
                {viewingSource.type === 'instagram' && viewingSource.metadata?.images && (
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {viewingSource.metadata.images.map((img, i) => {
                      const imgKey = `${viewingSource.id}-${i}`;
                      const isBroken = brokenImages[imgKey];
                      return (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center relative">
                          {isBroken ? (
                            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-red-500/5 to-yellow-500/5 flex flex-col items-center justify-center text-center p-1">
                              <Instagram className="w-4 h-4 text-pink-500/30 mb-1 animate-pulse" />
                              <span className="text-[8px] font-black text-slate-400">スライド {i + 1}</span>
                            </div>
                          ) : (
                            <img 
                              src={`/api/proxy-image?url=${encodeURIComponent(img)}`} 
                              alt={`slide-${i}`} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={() => {
                                setBrokenImages(prev => ({ ...prev, [imgKey]: true }));
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">Content / Transcription</h4>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {viewingSource.content}
                  </div>
                </div>

                {viewingSource.type === 'instagram' && viewingSource.metadata?.caption && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">元のキャプション（参考情報）</h4>
                    <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {viewingSource.metadata.caption}
                    </div>
                  </div>
                )}

                {viewingSource.metadata?.url && (
                  <div className="pt-6 border-t border-slate-100">
                    <a 
                      href={viewingSource.metadata.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                        viewingSource.type === 'instagram' ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {viewingSource.type === 'instagram' ? <Instagram className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      <span>元の{viewingSource.type === 'instagram' ? '投稿をInstagram' : '記事をブラウザ'}で見る</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setViewingSource(null)}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-slate-900 transition-all"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeStock;
