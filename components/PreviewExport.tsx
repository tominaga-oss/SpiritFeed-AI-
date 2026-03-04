
import React, { useState, useMemo, useRef } from 'react';
import { BlogContent } from '../types';
import { Download, Copy, CheckCircle2, ChevronLeft, ChevronRight, Calendar, Layers, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';

interface PreviewExportProps {
  content: BlogContent;
  imageUrl: string;
  onBack: () => void;
}

const PreviewExport: React.FC<PreviewExportProps> = ({ content, imageUrl, onBack }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);

  const cleanLine = (line: string) => line.trim().replace(/[、。]$/, "");

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const keyword = part.slice(2, -2);
        return (
          <span key={i} className="relative inline-block px-1">
            <span 
              className="absolute left-0 bottom-0.5 w-full h-2 z-0 opacity-40 rounded-sm"
              style={{ backgroundColor: content.accentColor }}
            />
            <span className="relative z-10" style={{ color: content.accentColor }}>{cleanLine(keyword)}</span>
          </span>
        );
      }
      return <span key={i}>{cleanLine(part)}</span>;
    });
  };

  const allContentSlides = useMemo(() => {
    const segments = content.body.split(/\n\n+/).filter(p => p.trim().length > 0);
    return segments.slice(0, 19);
  }, [content.body]);

  const totalSlides = 1 + allContentSlides.length;

  const handleCopyText = () => {
    const plainText = content.body.replace(/\[\[|\]\]/g, '');
    navigator.clipboard.writeText(`【${content.coverMainTitle.replace(/\n/g, ' ')}】\n\n${plainText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1080px / 400px = 2.7 (pixelRatio) to get exact 1080x1350 output
  const captureCurrentSlide = async (): Promise<string | null> => {
    if (!slideRef.current) return null;
    try {
      return await htmlToImage.toJpeg(slideRef.current, { 
        quality: 0.9, 
        pixelRatio: 2.7,
        cacheBust: true,
      });
    } catch (error) {
      console.error("Capture failed", error);
      return null;
    }
  };

  const handleDownloadSingle = async () => {
    const dataUrl = await captureCurrentSlide();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `slide_${activeSlide + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = async () => {
    if (isProcessingBulk) return;
    setIsProcessingBulk(true);
    setBulkProgress(0);
    
    const zip = new JSZip();
    const originalActive = activeSlide;

    try {
      for (let i = 0; i < totalSlides; i++) {
        setBulkProgress(i + 1);
        setActiveSlide(i);
        
        // 高速化: 待機時間を100msに短縮 (レンダリング完了を待つ最低限の時間)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const dataUrl = await captureCurrentSlide();
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          zip.file(`slide_${i + 1}.jpg`, base64Data, { base64: true });
        }
      }

      const contentBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "STORE" // 圧縮処理を省いて生成を高速化
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(contentBlob);
      link.download = `all_slides_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Bulk generation failed", error);
      alert("エラーが発生しました。");
    } finally {
      setActiveSlide(originalActive);
      setIsProcessingBulk(false);
    }
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left -> Next
      setActiveSlide(prev => Math.min(totalSlides - 1, prev + 1));
    } else if (distance < -minSwipeDistance) {
      // Swipe right -> Prev
      setActiveSlide(prev => Math.max(0, prev - 1));
    }
    setTouchStart(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20 relative">
      {isProcessingBulk && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin text-amber-400 mb-6" />
          <h2 className="text-xl font-black mb-2">高速ダウンロード用画像を生成中...</h2>
          <p className="text-slate-400 font-bold text-sm">Slide {bulkProgress} / {totalSlides}</p>
          <div className="w-48 h-1.5 bg-slate-700 rounded-full mt-6 overflow-hidden">
             <div 
               className="h-full bg-amber-400 transition-all duration-200" 
               style={{ width: `${(bulkProgress / totalSlides) * 100}%` }}
             />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-bold">
          <ChevronLeft className="w-5 h-5 mr-1" />
          デザインを修正
        </button>
        <div className="flex items-center space-x-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-widest">
          <span>{activeSlide + 1} / {totalSlides} SLIDES</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
        
        {/* Instagram Canvas Container */}
        <div className="relative group">
          <div 
            ref={slideRef}
            className="relative shrink-0 mx-auto lg:mx-0 shadow-2xl rounded-lg overflow-hidden bg-black"
            style={{ width: '400px', height: '500px' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-full h-full overflow-hidden">
              <img src={imageUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-black/20" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
                
                {/* SLIDE 1: COVER */}
                {activeSlide === 0 && (
                  <div className="w-full h-full relative flex items-center justify-center">
                    {content.coverPattern === 1 && (
                      <>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                          <div className="bg-white/95 border-l-8 px-3 py-10 shadow-2xl" style={{ borderColor: content.accentColor }}>
                            <p className="[writing-mode:vertical-rl] text-slate-900 font-black tracking-[0.4em] text-xl uppercase">
                              {cleanLine(content.coverHookBox)}
                            </p>
                          </div>
                        </div>
                        <div className="ml-24 text-left">
                          <h2 className="text-4xl font-black text-white leading-tight drop-shadow-2xl font-serif">
                            {content.coverMainTitle.split('\n').map((line, i) => (
                              <div key={i} style={{ color: i % 2 !== 0 ? content.accentColor : 'white' }}>{cleanLine(line)}</div>
                            ))}
                          </h2>
                        </div>
                      </>
                    )}

                    {content.coverPattern === 2 && (
                      <div className="flex flex-col items-center text-center space-y-10">
                        <div className="border-t border-b border-white/40 py-2 px-10">
                          <p className="text-white font-black text-lg tracking-[0.3em]">【 {cleanLine(content.coverHookBox)} 】</p>
                        </div>
                        <h2 className="text-4xl font-black text-white leading-snug drop-shadow-2xl font-serif">
                          {content.coverMainTitle.split('\n').map((line, i) => (
                            <div key={i} style={{ color: i === 1 ? content.accentColor : 'white' }}>{cleanLine(line)}</div>
                          ))}
                        </h2>
                      </div>
                    )}

                    {content.coverPattern === 3 && (
                      <div className="w-full h-full flex items-center justify-between">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="text-white/80 border-b border-white/30 pb-3 text-center">
                             <Calendar className="w-8 h-8 mx-auto mb-1" />
                             <p className="text-3xl font-black">{new Date().getMonth() + 1}月</p>
                          </div>
                          <p className="[writing-mode:vertical-rl] font-black text-xl tracking-[0.4em]" style={{ color: content.accentColor }}>{cleanLine(content.coverHookBox)}</p>
                        </div>
                        <div className="text-right flex-1 pr-4">
                          <h2 className="text-4xl font-black text-white leading-tight drop-shadow-2xl font-serif">
                             {content.coverMainTitle.split('\n').map((line, i) => (
                               <div key={i}>{cleanLine(line)}</div>
                             ))}
                          </h2>
                        </div>
                      </div>
                    )}

                    {content.coverPattern === 4 && (
                      <div className="w-full h-full flex flex-col justify-end items-center pb-10">
                        <h2 className="text-5xl font-black text-white leading-none tracking-tighter drop-shadow-2xl font-serif mb-10 text-center">
                           {content.coverMainTitle.split('\n').map((line, i) => (
                             <div key={i} style={{ color: i % 2 !== 0 ? content.accentColor : 'white' }}>{cleanLine(line)}</div>
                           ))}
                        </h2>
                        <div className="text-black font-black px-6 py-2.5 text-xl shadow-2xl rounded-sm" style={{ backgroundColor: content.accentColor }}>
                          {cleanLine(content.coverHookBox)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SLIDES 2+ */}
                {activeSlide >= 1 && (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div 
                      className={`w-full flex flex-col items-center ${content.bodyLayout === 'vertical' ? '[writing-mode:vertical-rl] h-full justify-center' : 'justify-center'}`}
                    >
                      {activeSlide === 1 && (
                        <div className={`${content.bodyLayout === 'vertical' ? 'ml-10' : 'mb-8'}`}>
                           <p className="text-white/60 text-xs font-black tracking-widest border border-white/30 px-3 py-1 rounded-full uppercase">Must Read</p>
                        </div>
                      )}
                      
                      <div className={`${content.bodyLayout === 'vertical' ? 'space-x-reverse space-x-6' : 'space-y-4 text-center'} text-white`}>
                        {allContentSlides[activeSlide - 1].split('\n').map((line, i) => (
                          <p 
                            key={i} 
                            className={`font-black font-serif leading-loose tracking-wider drop-shadow-lg ${activeSlide === 1 ? 'text-2xl' : 'text-xl'}`}
                          >
                            {renderFormattedText(line)}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex space-x-3 opacity-30">
                       {[...Array(3)].map((_, i) => (
                         <div key={i} className="w-1 h-1 rounded-full bg-white" />
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dot Indicators (Outside capture area) */}
          <div className="flex justify-center space-x-1.5 mt-4">
            {[...Array(totalSlides)].map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === i ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons (Outside capture area) */}
          <button onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))} className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-2 transition-all hidden lg:block" disabled={activeSlide === 0}><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => setActiveSlide(prev => Math.min(totalSlides - 1, prev + 1))} className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-2 transition-all hidden lg:block" disabled={activeSlide === totalSlides - 1}><ChevronRight className="w-6 h-6" /></button>
          
          {/* Mobile Navigation */}
          <div className="flex lg:hidden justify-center space-x-4 mt-4">
            <button onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))} className="bg-slate-200 p-2 rounded-full" disabled={activeSlide === 0}><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={() => setActiveSlide(prev => Math.min(totalSlides - 1, prev + 1))} className="bg-slate-200 p-2 rounded-full" disabled={activeSlide === totalSlides - 1}><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex-1 max-w-md space-y-6">
          <div className="space-y-4">
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">プレビュー・保存<br/><span className="text-indigo-600">全{totalSlides}枚</span></h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed">
              高速ダウンロード設定が適用されています。画質を最適化し、短時間で全ての画像を保存できるようにしました。
            </p>
          </div>
          
          <div className="grid gap-3 pt-4">
            <button 
              onClick={handleBulkDownload} 
              disabled={isProcessingBulk}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              <Layers className="w-6 h-6" /> 
              <span>一括ダウンロード (.zip)</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDownloadSingle} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 hover:bg-black transition-all shadow-lg active:scale-95">
                <Download className="w-4 h-4" /> <span>表示中の画像</span>
              </button>
              <button onClick={handleCopyText} className={`py-4 rounded-2xl font-black text-sm border-2 flex items-center justify-center space-x-2 transition-all active:scale-95 ${copied ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-300 text-slate-800 hover:border-slate-800'}`}>
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4 text-indigo-600" />} 
                <span>キャプション</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewExport;
