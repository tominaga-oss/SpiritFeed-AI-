
import React from 'react';
import { ArrowLeft, Check, Image as ImageIcon } from 'lucide-react';

interface ImageSelectorProps {
  images: string[];
  onSelect: (imageUrl: string) => void;
  onBack: () => void;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ images, onSelect, onBack }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-bold">
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </button>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          <ImageIcon className="w-3 h-3 mr-1" />
          背景画像の選択
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">お好みの背景を選んでください</h2>
        <p className="text-slate-500 font-bold">AIが生成した4つの候補から、最もイメージに近いものを選んでください。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <button
            key={index}
            onClick={() => onSelect(url)}
            className="group relative aspect-[4/5] rounded-2xl overflow-hidden border-4 border-transparent hover:border-indigo-500 transition-all shadow-lg hover:shadow-2xl active:scale-95"
          >
            <img 
              src={url} 
              alt={`Option ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                <Check className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageSelector;
