
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
        <h2 className="text-3xl font-bold text-slate-900">スピリチュアルブログ作成</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          書きたいテーマやタイトルを入力するだけで、AIが読者の心に響く記事構成を提案します。
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
              記事のテーマ・タイトル
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg"
              placeholder="例：人間関係の悩みを解消する3つの方法"
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
    </div>
  );
};

export default BlogGenerator;
