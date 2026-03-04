
import React, { useState } from 'react';
// Fix: Added Sparkles to the imported lucide-react icons
import { Send, BookOpen, Lightbulb, Sparkles } from 'lucide-react';

interface BlogGeneratorProps {
  onGenerate: (title: string) => void;
}

const BlogGenerator: React.FC<BlogGeneratorProps> = ({ onGenerate }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onGenerate(title);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-slate-900">魔法のような記事作成</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          タイトルを入力するだけで、SNSで話題になるスピリチュアルなブログ記事をAIが自動構成します。
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
              ブログ記事のタイトル
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="例：満月の夜に心を浄化する3つの儀式"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            <span>AIで文章を作成する</span>
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: <BookOpen className="w-5 h-5 text-indigo-500" />, title: "感情に訴える", desc: "読者の心に寄り添う温かい文体を採用します。" },
          { icon: <Lightbulb className="w-5 h-5 text-indigo-500" />, title: "3ステップ構成", desc: "記憶に残りやすい3つのポイント形式で構成。" },
          { icon: <Sparkles className="w-5 h-5 text-indigo-500" />, title: "トレンド反映", desc: "伸びているスピリチュアルブログの構成を分析。" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex items-start space-x-3">
            <div className="bg-indigo-50 p-2 rounded-lg shrink-0">{item.icon}</div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlogGenerator;