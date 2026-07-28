
import React, { useState, useRef, useEffect } from 'react';
import { AppState, BlogContent, BackgroundTheme } from './types';
import { generateBlogPatterns, generateBackgroundImage, extractTitleFromImage } from './services/geminiService';
import Header from './components/Header';
import BlogGenerator from './components/BlogGenerator';
import ContentScraper from './components/ContentScraper';
import KnowledgeStock from './components/KnowledgeStock';
import PatternSelector from './components/PatternSelector';
import ImageEditor from './components/ImageEditor';
import PreviewExport from './components/PreviewExport';
import { Loader2, AlertCircle, RefreshCcw, LogIn, Save, Clock, History, Sparkles } from 'lucide-react';
import { Source, BrandGuidelines } from './types';
import { 
  auth, 
  db, 
  defaultDb,
  loginAnonymously,
  loginWithGoogle,
  logout,
  handleFirestoreError, 
  OperationType 
} from './services/firebaseService';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [state, setState] = useState<AppState>(() => {
    return {
      step: 'generate-text',
      patterns: null,
      selectedPatternIndex: null,
      generatedImageUrl: null,
      customImageUrl: null,
      selectedTheme: 'random',
      selectedBrightness: 'bright',
      isGenerating: false,
      sources: [],
      selectedSourceIds: [],
      selectedDraftIds: [],
      brandGuidelines: {
        forbiddenWords: [],
        recommendedWords: [],
        structure: '1枚目: タイトルとフック\n2枚目: 読者の悩みへの共感\n3枚目: 本質的な気づき・視点の転換\n4枚目: 具体的なアクション・ワーク\n5枚目: まとめと保存の促し',
        tone: '落ち着いた知的なトーン、断定せず気づきを促す'
      },
      generationHistory: [],
    };
  });

  const [error, setError] = useState<string | null>(null);
  const lastTitleRef = useRef<string>('');

  // Auth & Migration Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        
        // Migration logic from localStorage
        const savedSources = localStorage.getItem('spiritfeed_sources');
        const savedDrafts = localStorage.getItem('spiritfeed_history'); // Legacy or previous history
        const savedGuidelines = localStorage.getItem('spiritfeed_guidelines');

        if (savedSources) {
          try {
            const sources = JSON.parse(savedSources) as Source[];
            for (const s of sources) {
              await setDoc(doc(db, 'sources', s.id), s);
            }
            localStorage.removeItem('spiritfeed_sources');
          } catch (e) { console.error("Migration failed:", e); }
        }

        if (savedGuidelines) {
          try {
            const guidelines = JSON.parse(savedGuidelines);
            await setDoc(doc(db, 'config', 'guidelines'), guidelines);
            localStorage.removeItem('spiritfeed_guidelines');
          } catch (e) { console.error("Migration failed:", e); }
        }

        if (savedDrafts) {
          try {
            const draftsArr = JSON.parse(savedDrafts);
            if (Array.isArray(draftsArr)) {
              for (const d of draftsArr) {
                // Safeguard: Ensure 'd' is a valid object before calling setDoc
                if (d && typeof d === 'object' && !Array.isArray(d)) {
                  const draftId = d.id || Math.random().toString(36).substr(2, 9);
                  await setDoc(doc(db, 'drafts', draftId), d);
                }
              }
            }
            localStorage.removeItem('spiritfeed_history');
          } catch (e) { console.error("Migration failed:", e); }
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [drafts, setDrafts] = useState<any[]>([]);
  const [activeStockTab, setActiveStockTab] = useState<'sources' | 'drafts'>('sources');

  // Sync Data from Firestore
  useEffect(() => {
    if (!user) return;

    let sourcesActive: Source[] = [];
    let sourcesDefault: Source[] = [];
    let draftsActive: any[] = [];
    let draftsDefault: any[] = [];

    const isDifferentDb = db !== defaultDb;

    const mergeAndMigrateSources = async (activeList: Source[], defaultList: Source[]) => {
      const mergedMap = new Map<string, Source>();
      
      // Load active list first
      activeList.forEach(item => {
        if (item && item.id) {
          mergedMap.set(item.id, item);
        }
      });

      // Load default list, migrate if missing in active list
      if (isDifferentDb) {
        for (const item of defaultList) {
          if (item && item.id && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
            // Migrate to active db
            try {
              await setDoc(doc(db, 'sources', item.id), item);
              console.log(`Successfully migrated source ${item.id} to active DB`);
            } catch (err) {
              console.error(`Failed to migrate source ${item.id}:`, err);
            }
          }
        }
      }

      const sortedSources = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      );
      setState(prev => ({ ...prev, sources: sortedSources }));
    };

    const mergeAndMigrateDrafts = async (activeList: any[], defaultList: any[]) => {
      const mergedMap = new Map<string, any>();

      activeList.forEach(item => {
        if (item && item.id) {
          mergedMap.set(item.id, item);
        }
      });

      if (isDifferentDb) {
        for (const item of defaultList) {
          if (item && item.id && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
            // Migrate to active db
            try {
              await setDoc(doc(db, 'drafts', item.id), item);
              console.log(`Successfully migrated draft ${item.id} to active DB`);
            } catch (err) {
              console.error(`Failed to migrate draft ${item.id}:`, err);
            }
          }
        }
      }

      const sortedDrafts = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      );
      setDrafts(sortedDrafts);
    };

    // 1. Listen to sources on active DB
    const sourcesRef = collection(db, 'sources');
    const unsubscribeSources = onSnapshot(sourcesRef, (snapshot) => {
      sourcesActive = snapshot.docs.map(doc => doc.data() as Source);
      mergeAndMigrateSources(sourcesActive, sourcesDefault);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sources'));

    // 2. Listen to sources on default DB (only if different)
    let unsubscribeSourcesDefault = () => {};
    if (isDifferentDb) {
      const sourcesDefaultRef = collection(defaultDb, 'sources');
      unsubscribeSourcesDefault = onSnapshot(sourcesDefaultRef, (snapshot) => {
        sourcesDefault = snapshot.docs.map(doc => doc.data() as Source);
        mergeAndMigrateSources(sourcesActive, sourcesDefault);
      }, (err) => console.warn("Default DB sources subscription warning:", err));
    }

    // 3. Listen to drafts on active DB
    const draftsRef = collection(db, 'drafts');
    const unsubscribeDrafts = onSnapshot(draftsRef, (snapshot) => {
      draftsActive = snapshot.docs.map(doc => doc.data());
      mergeAndMigrateDrafts(draftsActive, draftsDefault);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'drafts'));

    // 4. Listen to drafts on default DB (only if different)
    let unsubscribeDraftsDefault = () => {};
    if (isDifferentDb) {
      const draftsDefaultRef = collection(defaultDb, 'drafts');
      unsubscribeDraftsDefault = onSnapshot(draftsDefaultRef, (snapshot) => {
        draftsDefault = snapshot.docs.map(doc => doc.data());
        mergeAndMigrateDrafts(draftsActive, draftsDefault);
      }, (err) => console.warn("Default DB drafts subscription warning:", err));
    }

    // 5. Listen to guidelines on active DB
    const guidelinesRef = doc(db, 'config', 'guidelines');
    const unsubscribeGuidelines = onSnapshot(guidelinesRef, (snapshot) => {
      if (snapshot.exists()) {
        setState(prev => ({ ...prev, brandGuidelines: snapshot.data() as BrandGuidelines }));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/guidelines'));

    // 6. Listen to guidelines on default DB (only if different)
    let unsubscribeGuidelinesDefault = () => {};
    if (isDifferentDb) {
      const guidelinesDefaultRef = doc(defaultDb, 'config', 'guidelines');
      unsubscribeGuidelinesDefault = onSnapshot(guidelinesDefaultRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as BrandGuidelines;
          setState(prev => ({ ...prev, brandGuidelines: data }));
          // Migrate to active DB
          setDoc(guidelinesRef, data).catch(err => {
            console.error("Failed to migrate guidelines to active DB:", err);
          });
        }
      }, (err) => console.warn("Default DB guidelines subscription warning:", err));
    }

    return () => {
      unsubscribeSources();
      unsubscribeSourcesDefault();
      unsubscribeDrafts();
      unsubscribeDraftsDefault();
      unsubscribeGuidelines();
      unsubscribeGuidelinesDefault();
    };
  }, [user]);

  const handleStartGeneration = async (title: string) => {
    if (!user) {
      setError("文章を作成するにはログインが必要です。");
      return;
    }
    lastTitleRef.current = title;
    setState(prev => ({ ...prev, isGenerating: true }));
    setError(null);
    try {
      // Logic: If specific sources are selected, use them. 
      // If none are selected, use ALL sources (Title-only mode).
      const effectiveSources = state.selectedSourceIds.length > 0
        ? state.sources.filter(s => state.selectedSourceIds.includes(s.id))
        : state.sources;

      const effectiveDrafts = state.selectedDraftIds.length > 0
        ? drafts.filter(d => state.selectedDraftIds.includes(d.id))
        : [];

      const patterns = await generateBlogPatterns(title, effectiveSources, state.brandGuidelines, state.generationHistory, effectiveDrafts);
      
      // Update history with the new patterns (keep last 12 patterns)
      const newHistory = [...state.generationHistory];
      patterns.forEach(p => {
        const historyItem = `${p.styleLabel}: ${p.coverMainTitle.substring(0, 20)}`;
        if (!newHistory.includes(historyItem)) {
          newHistory.unshift(historyItem);
        }
      });
      
      setState(prev => ({ 
        ...prev, 
        patterns, 
        generationHistory: newHistory.slice(0, 12),
        step: 'select-pattern', 
        isGenerating: false 
      }));
    } catch (err: any) {
      console.error(err);
      const isQuota = err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('Rate limit');
      setError(isQuota 
        ? "AIの利用制限に達しました。モデルを軽量版に切り替えましたが、現在アクセスが集中しています。1〜2分待ってから「もう一度試す」を押してください。" 
        : "文章の作成に失敗しました。タイトルを変えてもう一度お試しください。");
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleSelectPattern = (index: number) => {
    setState(prev => ({ 
      ...prev, 
      selectedPatternIndex: index,
      step: 'design-select'
    }));
  };

  const handleUpdateContent = (updatedContent: BlogContent) => {
    if (state.patterns && state.selectedPatternIndex !== null) {
      const newPatterns = [...state.patterns];
      newPatterns[state.selectedPatternIndex] = updatedContent;
      setState(prev => ({ ...prev, patterns: newPatterns }));
    }
  };

  const handleDesignConfirm = async (theme: BackgroundTheme, brightness: 'bright' | 'dark', customImage?: string | null) => {
    if (!state.patterns || state.selectedPatternIndex === null) return;
    const currentPattern = state.patterns[state.selectedPatternIndex];
    
    const finalCustomImage = customImage !== undefined ? customImage : state.customImageUrl;
    
    setState(prev => ({ ...prev, isGenerating: true, selectedTheme: theme, selectedBrightness: brightness, customImageUrl: finalCustomImage }));
    setError(null);
    try {
      let imageUrl = null;
      if (theme === 'custom' && finalCustomImage) {
        imageUrl = finalCustomImage;
      } else {
        imageUrl = await generateBackgroundImage(theme, currentPattern.title, brightness);
      }
      
      setState(prev => ({ 
        ...prev, 
        generatedImageUrl: imageUrl, 
        step: 'preview-export', 
        isGenerating: false 
      }));
    } catch (err: any) {
      console.error(err);
      const isQuota = err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('Rate limit');
      setError(isQuota 
        ? "画像の生成制限に達しました。少し待ってから再度「もう一度試す」を押してください。" 
        : "画像の生成に失敗しました。別のテーマを試してみてください。");
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleRetry = () => {
    if (state.step === 'generate-text' || state.step === 'select-pattern') {
      if (lastTitleRef.current) handleStartGeneration(lastTitleRef.current);
    } else if (state.step === 'design-select') {
      handleDesignConfirm(state.selectedTheme, state.selectedBrightness);
    }
  };

  const handleRegisterStyleReference = async (source: Source) => {
    if (!user) return;
    try {
      const draftId = Math.random().toString(36).substring(7);
      const newDraft = {
        id: draftId,
        title: `【手本】${source.name}`,
        body: source.content,
        styleLabel: '手本登録',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'drafts', draftId), newDraft);
      setActiveStockTab('drafts');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'drafts');
    }
  };

  const reset = () => {
    setError(null);
    setState(prev => ({
      ...prev,
      step: 'generate-text',
      patterns: null,
      selectedPatternIndex: null,
      generatedImageUrl: null,
      selectedTheme: prev.customImageUrl ? 'custom' : 'random',
      selectedBrightness: 'bright',
      isGenerating: false,
    }));
  };

  const handleAddSource = async (source: Source) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'sources', source.id), source);
      setState(prev => ({ 
        ...prev, 
        selectedSourceIds: [source.id] 
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sources/${source.id}`);
    }
  };

  const handleRemoveSource = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'sources', id));
      setState(prev => ({ 
        ...prev, 
        selectedSourceIds: prev.selectedSourceIds.filter(sid => sid !== id)
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sources/${id}`);
    }
  };

  const handleToggleSource = (id: string) => {
    setState(prev => {
      const isSelected = prev.selectedSourceIds.includes(id);
      const newSelected = isSelected
        ? prev.selectedSourceIds.filter(sid => sid !== id)
        : [...prev.selectedSourceIds, id];
      return { ...prev, selectedSourceIds: newSelected };
    });
  };

  const handleToggleDraft = (id: string) => {
    setState(prev => {
      const isSelected = prev.selectedDraftIds.includes(id);
      const newSelected = isSelected
        ? prev.selectedDraftIds.filter(sid => sid !== id)
        : [...prev.selectedDraftIds, id];
      return { ...prev, selectedDraftIds: newSelected };
    });
  };

  const handleUpdateGuidelines = async (guidelines: BrandGuidelines) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'config', 'guidelines'), guidelines);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/guidelines');
    }
  };

  const handleRefreshTitle = async (id: string) => {
    const source = state.sources.find(s => s.id === id);
    if (!source || source.type !== 'instagram' || !source.metadata?.images?.[0] || !user) return;

    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(source.metadata.images[0])}`;
      const newTitle = await extractTitleFromImage(proxyUrl);
      
      const updateRef = doc(db, 'sources', id);
      if (newTitle && newTitle !== 'NO_TITLE' && newTitle !== 'Instagram投稿') {
        await setDoc(updateRef, { ...source, name: newTitle });
      } else {
        const firstLine = source.content.split('\n')[0].trim().replace(/^#+\s*/, '');
        if (firstLine && firstLine.length > 2) {
          const fallbackTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
          await setDoc(updateRef, { ...source, name: fallbackTitle });
        }
      }
    } catch (err) {
      console.error("Failed to refresh title:", err);
    }
  };

  const saveToDrafts = async () => {
    if (!user || !state.patterns || state.selectedPatternIndex === null) return;
    const currentPattern = state.patterns[state.selectedPatternIndex];
    const draftId = `draft_${Date.now()}`;
    
    try {
      await setDoc(doc(db, 'drafts', draftId), {
        ...currentPattern,
        id: draftId,
        imageUrl: state.generatedImageUrl,
        theme: state.selectedTheme,
        brightness: state.selectedBrightness,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      alert("ドラフトとして保存しました。");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `drafts/${draftId}`);
    }
  };

  const handleRemoveDraft = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'drafts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `drafts/${id}`);
    }
  };

  const handleSelectDraft = (draft: any) => {
    setState(prev => ({
      ...prev,
      patterns: [draft],
      selectedPatternIndex: 0,
      generatedImageUrl: draft.imageUrl,
      selectedTheme: draft.theme || 'random',
      selectedBrightness: draft.brightness || 'bright',
      step: 'preview-export'
    }));
  };

  const currentPattern = state.patterns && state.selectedPatternIndex !== null 
    ? state.patterns[state.selectedPatternIndex] 
    : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">魂を同期中...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async () => {
    try {
      const u = await loginWithGoogle();
      setUser(u);
    } catch (e: any) {
      setError("ログインに失敗しました。詳細: " + e.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl space-y-8">
          <div className="bg-indigo-500 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              スピリチュアルブログ作成<span className="text-indigo-500">AI</span>
            </h1>
            <p className="text-slate-500 font-bold leading-relaxed">
              あなたの「魂」と「知恵」を整理し、<br />最高のアウトプットを作成します。
            </p>
          </div>
          
          <div className="pt-4 space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              <LogIn className="w-6 h-6 mr-3" />
              Googleでログイン
            </button>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              安全にログインして作成を開始
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium">
              ※匿名ログインが制限されているため、Googleアカウントでのログインが必要です。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      <Header user={user} onHomeClick={reset} onLogout={logout} />
      
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {state.isGenerating && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-6 text-center p-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-black text-slate-800 tracking-tight">AIが魂を込めて作成中...</p>
              <p className="text-slate-500 font-bold max-w-xs mx-auto text-sm">
                高品質な文章と画像を生成しています。制限回避のためゆっくり処理しています。
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start space-x-4 animate-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-rose-800 font-black mb-1">エラーが発生しました</h3>
              <p className="text-rose-600 text-sm font-bold leading-relaxed mb-4">{error}</p>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black flex items-center hover:bg-rose-700 transition-all shadow-md active:scale-95"
                >
                  <RefreshCcw className="w-3 h-3 mr-2" />
                  もう一度試す
                </button>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs font-black text-rose-400 hover:text-rose-600 underline"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {state.step === 'generate-text' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              <ContentScraper onAddSource={handleAddSource} />
              <BlogGenerator onGenerate={handleStartGeneration} />
            </div>
            <div className="lg:col-span-1">
              <KnowledgeStock 
                sources={state.sources} 
                drafts={drafts}
                activeTab={activeStockTab}
                onTabChange={setActiveStockTab}
                selectedIds={state.selectedSourceIds}
                selectedDraftIds={state.selectedDraftIds}
                onAdd={handleAddSource}
                onToggle={handleToggleSource}
                onToggleDraft={handleToggleDraft}
                onRemove={handleRemoveSource} 
                onRemoveDraft={handleRemoveDraft}
                onSelectDraft={handleSelectDraft}
                onRefreshTitle={handleRefreshTitle}
                onRegisterStyleReference={handleRegisterStyleReference}
              />
            </div>
          </div>
        )}

        {state.step === 'select-pattern' && state.patterns && (
          <PatternSelector 
            patterns={state.patterns} 
            onSelect={handleSelectPattern} 
            onBack={reset}
          />
        )}

        {state.step === 'design-select' && currentPattern && (
          <ImageEditor 
            content={currentPattern} 
            initialTheme={state.selectedTheme}
            initialBrightness={state.selectedBrightness}
            initialCustomImage={state.customImageUrl}
            onConfirm={handleDesignConfirm}
            onUpdateContent={handleUpdateContent}
            onBack={() => setState(prev => ({ ...prev, step: 'select-pattern' }))}
            onThemeChange={(theme) => setState(prev => ({ ...prev, selectedTheme: theme }))}
            onBrightnessChange={(brightness) => setState(prev => ({ ...prev, selectedBrightness: brightness }))}
            onCustomImageChange={(imageUrl) => setState(prev => ({ ...prev, customImageUrl: imageUrl }))}
          />
        )}

        {state.step === 'preview-export' && currentPattern && state.generatedImageUrl && (
          <div className="space-y-6">
            <div className="flex justify-end space-x-4">
              <button 
                onClick={saveToDrafts}
                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
              >
                <Save className="w-5 h-5 mr-3" />
                ドラフトとして保存
              </button>
            </div>
            <PreviewExport 
              content={currentPattern} 
              imageUrl={state.generatedImageUrl}
              onBack={() => setState(prev => ({ ...prev, step: 'design-select' }))}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
