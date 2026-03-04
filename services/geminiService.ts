
import { GoogleGenAI, Type } from "@google/genai";
import { BlogContent, BackgroundTheme } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// リトライ用ヘルパー関数
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.message?.includes('429') || 
      error?.message?.includes('quota') || 
      error?.message?.includes('Rate limit');
    
    if (isQuotaError && retries > 0) {
      console.log(`Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); // 指数バックオフ
    }
    throw error;
  }
}

export const generateBlogPatterns = async (title: string): Promise<BlogContent[]> => {
  return withRetry(async () => {
    const ai = getAI();
    // 制限が緩い gemini-3-flash-preview に変更
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `タイトル「${title}」に基づき、Instagram（1080×1350px）用の4つの記事パターンを作成してください。
      
      【パターンの構成】
      - パターン1 & 2：【ストーリー/ブログ形式】
        一つの深いテーマについて、起承転結のある一つの文章を分割して構成してください。ブログのように読み応えのある内容にしてください。styleLabelは「ストーリー/ブログ」としてください。
      - パターン3 & 4：【アクション/メソッド形式】
        具体的な「行動」や「ステップ」を教える形式にしてください。読者がすぐに実践できる具体的なヒントを複数提示してください。styleLabelは「アクション/メソッド」としてください。

      【全体共通の禁止事項・ルール】
      1. 挨拶（「こんにちは」等）は一切不要。
      2. 普遍的な成功法則や人生の理（ことわり）として記述。
      3. 語尾は「～です」「～ます」と丁寧な口調で記述してください。
      4. 各行の末尾に句読点（、。）を絶対に入れないでください。
      
      【構成要素と枚数】
      - 表紙(1枚) + 本編(12枚〜19枚) = 合計【最低13枚以上】の構成にしてください。
      - coverMainTitle: 表紙用。必ず【3行】になるよう改行(\\n)を入れる。
      - body: 本編。1枚あたり100〜150文字程度。
        - 重要なキーワードや強調したいフレーズは [[強調したい言葉]] のように二重ブラケットで囲ってください。
        - 各スライドの区切りはダブル改行(\\n\\n)で行ってください。
        - 【重要】最後のスライドには必ず以下の形式でCTA（アクション喚起）を含めてください。
          このコメント欄へ
          【（記事の内容に合わせたポジティブな宣言、例：豊かさを受け取りました）】
          と書き残して神事は完了です
          （保存して何度も見返してください）
          ※【】の中身は、記事のテーマに最も適した「受け取りの言葉」をAIが考えて作成してください。
      
      JSON形式で返してください。bodyLayoutはデフォルト'horizontal'、accentColorは'#f59e0b'に設定してください。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              styleLabel: { type: Type.STRING },
              coverMainTitle: { type: Type.STRING },
              coverHookBox: { type: Type.STRING },
              body: { type: Type.STRING },
              coverPattern: { type: Type.NUMBER },
              bodyLayout: { type: Type.STRING },
              accentColor: { type: Type.STRING }
            },
            required: ["title", "styleLabel", "coverMainTitle", "coverHookBox", "body", "coverPattern", "bodyLayout", "accentColor"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]') as BlogContent[];
  });
};

export const generateBackgroundImage = async (theme: BackgroundTheme, blogTitle: string, brightness: 'bright' | 'dark' = 'bright'): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    
    let promptTheme = theme === 'random' ? 'serene spiritual atmosphere' : theme;
    if (theme === 'shrine') promptTheme = 'Japanese shrine torii gates, serene and sacred atmosphere, 4k';
    if (theme === 'sky') promptTheme = 'beautiful sky with soft clouds and golden rays';
    if (theme === 'forest') promptTheme = 'vibrant green bamboo forest with sunlight filtering through leaves, peaceful';
    if (theme === 'temple') promptTheme = 'Japanese Zen garden, serene stone patterns and green moss';

    const lighting = brightness === 'bright' 
      ? 'High-key lighting, bright and airy but slightly underexposed to ensure white text is highly legible' 
      : 'Low-key lighting, dark and mystical, deep shadows to ensure white text is highly legible';

    const prompt = `Atmospheric professional background of ${promptTheme}. ${lighting}. Serene, positive, and sacred vibe. No characters, no text. Japanese aesthetic. 4:5 aspect ratio.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Failed to generate image");
  });
};
