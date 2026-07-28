
import React, { useState } from 'react';
import { Instagram, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, Globe } from 'lucide-react';
import { Source } from '../types';
import { extractTitleFromImage, transcribeImages } from '../services/geminiService';

interface ContentScraperProps {
  onAddSource: (source: Source) => void;
}

type TabType = 'instagram' | 'blog';

const ContentScraper: React.FC<ContentScraperProps> = ({ onAddSource }) => {
  const [activeTab, setActiveTab] = useState<TabType>('instagram');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingTitle, setIsExtractingTitle] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Instagram specific data
  const [scrapedData, setScrapedData] = useState<{
    caption: string;
    images: string[];
    ownerUsername: string;
    url: string;
    extractedTitle?: string;
    transcription?: string;
  } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Blog specific data
  const [blogData, setBlogData] = useState<{
    title: string;
    content: string;
    author: string;
    url: string;
  } | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setScrapedData(null);
    setBlogData(null);

    // Auto-detect tab if user pastes URL into wrong tab
    let effectiveTab = activeTab;
    if (url.includes('instagram.com')) {
      effectiveTab = 'instagram';
      setActiveTab('instagram');
    } else if (url.startsWith('http') && !url.includes('instagram.com')) {
      effectiveTab = 'blog';
      setActiveTab('blog');
    }

    try {
      const endpoint = effectiveTab === 'instagram' ? '/api/scrape-instagram' : '/api/scrape-url';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || '情報の取得に失敗しました');
        } else {
          const text = await response.text();
          console.error('Non-JSON error response:', text);
          throw new Error(`サーバーエラーが発生しました (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (effectiveTab === 'instagram') {
        setScrapedData(data);
        // Extract title and transcribe images for Instagram
        if (data.images && data.images.length > 0) {
          setIsExtractingTitle(true);
          setIsTranscribing(true);
          
          const titlePromise = extractTitleFromImage(`/api/proxy-image?url=${encodeURIComponent(data.images[0])}`);
          const transcriptionPromise = transcribeImages(data.images.map(img => `/api/proxy-image?url=${encodeURIComponent(img)}`));

          Promise.all([titlePromise, transcriptionPromise])
            .then(([title, transcription]) => {
              setScrapedData(prev => prev ? { ...prev, extractedTitle: title, transcription: transcription } : null);
            })
            .catch(err => {
              console.error("AI processing failed:", err);
            })
            .finally(() => {
              setIsExtractingTitle(false);
              setIsTranscribing(false);
            });
        }
      } else {
        setBlogData(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInstagram = () => {
    if (!scrapedData || isExtractingTitle || isTranscribing) return;

    let finalName = scrapedData.extractedTitle;
    const isGenericTitle = !finalName || 
                          finalName === 'NO_TITLE' || 
                          finalName === 'Instagram投稿' || 
                          finalName.length < 2;

    if (isGenericTitle) {
      const lines = scrapedData.caption.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
      const firstLine = lines.length > 0 ? lines[0] : '';
      if (firstLine && firstLine.length > 2) {
        finalName = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
      } else {
        finalName = `Instagram: @${scrapedData.ownerUsername}`;
      }
    }

    const newSource: Source = {
      id: Math.random().toString(36).substring(7),
      name: finalName || `Instagram: @${scrapedData.ownerUsername}`,
      content: scrapedData.transcription 
        ? `【画像内のスライドの文字起こしテキスト】\n${scrapedData.transcription}`
        : scrapedData.caption || "(Instagram画像からテキストを文字起こしし、その教えを元に執筆してください)",
      type: 'instagram',
      createdAt: Date.now(),
      metadata: {
        images: scrapedData.images,
        url: scrapedData.url,
        username: scrapedData.ownerUsername,
        caption: scrapedData.caption
      }
    };

    onAddSource(newSource);
    setScrapedData(null);
    setUrl('');
  };

  const handleAddBlog = () => {
    if (!blogData) return;

    const newSource: Source = {
      id: Math.random().toString(36).substring(7),
      name: blogData.title || '無題のブログ記事',
      content: blogData.content,
      type: 'blog',
      createdAt: Date.now(),
      metadata: {
        url: blogData.url,
        author: blogData.author
      }
    };

    onAddSource(newSource);
    setBlogData(null);
    setUrl('');
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('instagram')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'instagram' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram</span>
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'blog' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>ブログ・Web</span>
          </button>
        </div>
      </div>
      
      {activeTab === 'instagram' ? (
        <p className="text-xs text-slate-500 font-bold">
          参考にする投稿のURLを入力してください。スライド画像をAIが「文字起こし」し、その哲学を抽出します。
        </p>
      ) : (
        <p className="text-xs text-slate-500 font-bold">
          noteなどのブログ記事やWebサイトのURLを入力してください。記事の内容を自動で抽出し、知識ベースに蓄積します。
        </p>
      )}

      <div className="flex space-x-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
            placeholder={activeTab === 'instagram' ? "https://www.instagram.com/p/..." : "https://note.com/your-article/..."}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center space-x-2 active:scale-95"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>取得</span>}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-600 text-xs animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="font-bold leading-relaxed">{error}</span>
        </div>
      )}

      {/* Instagram Results */}
      {scrapedData && (
        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-indigo-100 shadow-sm">
                <Instagram className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">取得完了: @{scrapedData.ownerUsername}</span>
                {isExtractingTitle || isTranscribing ? (
                  <span className="text-[10px] text-indigo-400 animate-pulse font-bold">
                    解析中...
                  </span>
                ) : (
                  <span className="text-[10px] text-indigo-600 font-black">
                    保存名: {scrapedData.extractedTitle && scrapedData.extractedTitle !== 'NO_TITLE' 
                      ? scrapedData.extractedTitle 
                      : (scrapedData.caption.split('\n')[0].trim().substring(0, 30) || `@${scrapedData.ownerUsername}`)}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-indigo-600 font-black bg-white/80 px-3 py-1 rounded-full border border-indigo-100">
              画像 {scrapedData.images.length} 枚
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {scrapedData.images.slice(0, 5).map((img, i) => {
              const imgKey = `scraped-${i}`;
              const isBroken = brokenImages[imgKey];
              return (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border-2 border-white shadow-sm relative group bg-slate-50 flex items-center justify-center">
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
                  {i === 4 && scrapedData.images.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-black">
                      +{scrapedData.images.length - 5}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddInstagram}
            disabled={isExtractingTitle || isTranscribing}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95 translate-y-0 hover:-translate-y-0.5"
          >
            {isExtractingTitle || isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI解析中...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>画像を文字起こしして知識ベースに追加</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Blog Results */}
      {blogData && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-emerald-100 shadow-sm text-emerald-600">
                <FileText className="w-5 h-5" />
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="text-xs font-black text-slate-800 truncate">{blogData.title}</h4>
               <p className="text-[10px] text-emerald-600 font-black">{blogData.author || '読み込み中...'}</p>
             </div>
          </div>
          
          <div className="bg-white/50 rounded-xl p-3 max-h-32 overflow-hidden relative">
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed whitespace-pre-wrap">
              {blogData.content.substring(0, 300)}...
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/80 to-transparent" />
          </div>

          <button
            onClick={handleAddBlog}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 shadow-md active:scale-95 translate-y-0 hover:-translate-y-0.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>この記事を知識ベースに追加</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentScraper;
