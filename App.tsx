
import React, { useState, useRef } from 'react';
import { AppState, BlogContent, BackgroundTheme } from './types';
import { generateBlogPatterns, generateBackgroundImage } from './services/geminiService';
import Header from './components/Header';
import BlogGenerator from './components/BlogGenerator';
import PatternSelector from './components/PatternSelector';
import ImageEditor from './components/ImageEditor';
import PreviewExport from './components/PreviewExport';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'generate-text',
    patterns: null,
    selectedPatternIndex: null,
    generatedImageUrl: null,
    selectedTheme: 'random',
    selectedBrightness: 'bright',
    isGenerating: false,
  });

  const [error, setError] = useState<string | null>(null);
  const lastTitleRef = useRef<string>('');

  const handleStartGeneration = async (title: string) => {
    lastTitleRef.current = title;
    setState(prev => ({ ...prev, isGenerating: true }));
    setError(null);
    try {
      const patterns = await generateBlogPatterns(title);
      setState(prev => ({ 
        ...prev, 
        patterns, 
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

  const handleDesignConfirm = async (theme: BackgroundTheme, brightness: 'bright' | 'dark') => {
    if (!state.patterns || state.selectedPatternIndex === null) return;
    const currentPattern = state.patterns[state.selectedPatternIndex];
    
    setState(prev => ({ ...prev, isGenerating: true, selectedTheme: theme, selectedBrightness: brightness }));
    setError(null);
    try {
      const imageUrl = await generateBackgroundImage(theme, currentPattern.title, brightness);
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

  const reset = () => {
    setError(null);
    setState({
      step: 'generate-text',
      patterns: null,
      selectedPatternIndex: null,
      generatedImageUrl: null,
      selectedTheme: 'random',
      selectedBrightness: 'bright',
      isGenerating: false,
    });
  };

  const currentPattern = state.patterns && state.selectedPatternIndex !== null 
    ? state.patterns[state.selectedPatternIndex] 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      <Header onHomeClick={reset} />
      
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
          <BlogGenerator onGenerate={handleStartGeneration} />
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
            onConfirm={handleDesignConfirm}
            onUpdateContent={handleUpdateContent}
            onBack={() => setState(prev => ({ ...prev, step: 'select-pattern' }))}
          />
        )}

        {state.step === 'preview-export' && currentPattern && state.generatedImageUrl && (
          <PreviewExport 
            content={currentPattern} 
            imageUrl={state.generatedImageUrl}
            onBack={() => setState(prev => ({ ...prev, step: 'design-select' }))}
          />
        )}
      </main>
    </div>
  );
};

export default App;
