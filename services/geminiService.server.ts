import { GoogleGenAI, Type } from "@google/genai";
import { BlogContent, BackgroundTheme, Source, BrandGuidelines } from "../types.js";

const getAPIKeys = () => {
  const keys = [
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.SECOND_GEMINI_API_KEY,
    process.env.SECONDARY_API_KEY
  ].filter(Boolean) as string[];
  
  return keys.length > 0 ? keys : [''];
};

let currentKeyIndex = 0;

const getAI = () => {
  const keys = getAPIKeys();
  return new GoogleGenAI({ apiKey: keys[currentKeyIndex % keys.length] });
};

async function urlToBase64Server(url: string): Promise<{ data: string, mimeType: string } | null> {
  try {
    let finalUrl = url;
    if (url.startsWith('//')) {
      finalUrl = 'https:' + url;
    }

    if (finalUrl.includes('/api/proxy-image?url=')) {
      const parts = finalUrl.split('/api/proxy-image?url=');
      if (parts.length > 1) {
        finalUrl = decodeURIComponent(parts[1]);
      }
    }

    const response = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch image on server: ${response.status} ${response.statusText} for ${finalUrl.substring(0, 50)}...`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      data: base64,
      mimeType: response.headers.get("content-type") || "image/jpeg"
    };
  } catch (e) {
    console.error("Failed to fetch image for Gemini on server:", e);
    return null;
  }
}

async function withRetryServer<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransientError = 
      error?.message?.includes('429') || 
      error?.message?.includes('quota') || 
      error?.message?.includes('Rate limit') ||
      error?.message?.includes('hard limit exceeded') ||
      error?.message?.includes('503') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.message?.includes('high demand') ||
      error?.message?.includes('temporary') ||
      error?.status === 503 ||
      error?.code === 503;
    
    if (isTransientError) {
      const keys = getAPIKeys();
      if (keys.length > 1 && (error?.message?.includes('429') || error?.message?.includes('quota'))) {
        currentKeyIndex++;
        console.log(`Transient limit reached. Switching to next API key (Index: ${currentKeyIndex % keys.length})...`);
        return withRetryServer(fn, retries, delay);
      }
      
      if (retries > 0) {
        console.log(`Transient error detected (${error?.message?.substring(0, 80)}...). Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetryServer(fn, retries - 1, delay * 1.5);
      }
    }
    throw error;
  }
}

async function generateContentWithFallback(
  ai: any,
  params: any,
  primaryModel: string = 'gemini-3.5-flash',
  fallbackModels: string[] = ['gemini-3.1-flash-lite', 'gemini-flash-latest']
): Promise<any> {
  const modelsToTry = [primaryModel, ...fallbackModels];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        ...params,
        model: model,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const isTransient = 
        error?.message?.includes('503') ||
        error?.message?.includes('UNAVAILABLE') ||
        error?.message?.includes('high demand') ||
        error?.message?.includes('temporary') ||
        error?.status === 503 ||
        error?.code === 503 ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') || 
        error?.message?.includes('Rate limit') ||
        error?.message?.includes('hard limit exceeded');
      
      console.warn(`Model ${model} failed: ${error?.message || error}. Transient? ${isTransient}`);
      
      if (isTransient) {
        const keys = getAPIKeys();
        if (keys.length > 1 && (error?.message?.includes('429') || error?.message?.includes('quota'))) {
          currentKeyIndex++;
          console.log(`Switching API key for retry (Index: ${currentKeyIndex % keys.length})...`);
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export const transcribeImagesServer = async (imageUrls: string[]): Promise<string> => {
  return withRetryServer(async () => {
    const ai = getAI();
    const imagePromises = imageUrls.slice(0, 20).map(url => urlToBase64Server(url));
    const imgDataArray = await Promise.all(imagePromises);
    
    const validImgData = imgDataArray.filter((data): data is { data: string, mimeType: string } => data !== null);
    if (validImgData.length === 0) throw new Error("Failed to load any images for transcription");

    const response = await generateContentWithFallback(ai, {
      contents: {
        parts: [
          ...validImgData.map(data => ({ inlineData: data })),
          { text: "これらの画像はInstagramのカルーセル投稿（スライド）です。すべての画像に含まれているテキストを、スライドの順番通りに一言一句漏らさず「文字起こし」してください。装飾的な言葉や説明は不要です。スライドごとに区切って出力してください。画像内に文字がない場合はそのスライドをスキップしてください。" }
        ]
      },
      config: {
        temperature: 0.1,
      }
    });

    const text = response.text || "";
    return text.replace(/【?スライド\s*\d+】?|【?Slide\s*\d+】?/gi, '').trim();
  });
};

export const extractTitleFromImageServer = async (imageUrl: string): Promise<string> => {
  return withRetryServer(async () => {
    const ai = getAI();
    const imgData = await urlToBase64Server(imageUrl);
    if (!imgData) throw new Error("Failed to load image");

    const response = await generateContentWithFallback(ai, {
      contents: {
        parts: [
          { inlineData: imgData },
          { text: "この画像はInstagram投稿の1枚目（表紙）です。画像の中で最も大きく目立っている「メインタイトル」の文字列のみを抽出して返してください。余計な説明や装飾文字、サブタイトルは含めないでください。もし文字が全く読み取れない場合や、タイトルらしきものがない場合のみ「NO_TITLE」と返してください。" }
        ]
      },
      config: {
        temperature: 0.1,
      }
    });

    const text = response.text?.trim() || "NO_TITLE";
    return text;
  });
};

export const generateBlogPatternsServer = async (
  title: string, 
  sources: Source[] = [], 
  guidelines?: BrandGuidelines, 
  history: string[] = [], 
  selectedDrafts: any[] = []
): Promise<BlogContent[]> => {
  return withRetryServer(async () => {
    const ai = getAI();
    
    const historyContext = history.length > 0
      ? `\n\n【直近の生成履歴（これらと内容・切り口が被らないようにしてください）】\n${history.map(h => `- ${h}`).join('\n')}`
      : "";

    const draftContext = selectedDrafts.length > 0
      ? `\n\n【マザーDB：執筆の「声」と「型」のお手本（あなたの文章の魂）】\n以下の内容は、あなたが過去に作成した「成功パターンのレプリカ」です。\nこれらは、今回のコンテンツを流し込むための「器」であり「語り口」の正解です。\n\n1. 声（Voice）: 文末の結び方（〜ください、〜ですね、〜なのです、等）、特有の比喩、文章の「呼吸（リズム）」を100%ここから盗んでください。\n2. 読者への向き合い方: 読者の悩みに対して「どのような温度感」で寄り添い、最後に「どこへ着地させているか（読後感）」を再現してください。\n3. 【最重要・知識使用禁止】: マザーDBに含まれる具体的エピソードやスピリチュアルな知識は、今回は一切無視してください。これらはあくまで「声」を思い出すための資料です。\n\n${selectedDrafts.map(d => `--- 声の手本: ${d.title} ---\n${d.body}`).join('\n\n')}`
      : "";

    const brandContext = guidelines 
      ? `\n\n【ブランド・スタイルガイド】\n1. 禁止ワード: ${guidelines.forbiddenWords.join(', ') || 'なし'}\n2. 推奨ワード: ${guidelines.recommendedWords.join(', ') || 'なし'}\n3. 投稿の構成・型: \n${guidelines.structure}\n4. 口調・トーン: ${guidelines.tone}`
      : "";

    const imageParts: any[] = [];
    const imagePromises: Promise<{ data: string, mimeType: string } | null>[] = [];
    
    for (const source of sources) {
      if (source.type === 'instagram' && source.metadata?.images) {
        const urls = source.metadata.images.slice(0, 20);
        for (const imgUrl of urls) {
          imagePromises.push(urlToBase64Server(imgUrl));
        }
      }
    }

    const loadedImages = await Promise.all(imagePromises);
    for (const imgData of loadedImages) {
      if (imgData) {
        imageParts.push({ inlineData: imgData });
      }
    }

    const sourceContext = sources.length > 0 
      ? `\n\n【メインDB：今回の具体的ネタ・知識・真実（絶対的ソース）】\n以下の資料は、今回の執筆における「唯一の正解」であり、情報（Content）の源泉です。\nここの内容が、今回の記事の「骨」と「肉」になります。\nここに含まれていない新しい概念や、マザーDBの過去の知識を混ぜることは「情報の汚染」とみなし厳禁とします。\n\n${sources.map(s => `--- 今回の知識源: ${s.name} ---\n${s.content}${s.type === 'instagram' ? '\n(※極めて重要：この添付画像の文字起こし内容こそが、今回の記事の核となる「真実」です。ここから一歩も外れず、深掘りしてください)' : ''}`).join('\n\n')}`
      : "";

    const masterSystemPrompt = `
# 【マスターシステムプロンプト】スピリチュアルブログ・自動生成アルゴリズム
${brandContext}${draftContext}${sourceContext}${historyContext}

## 1. あなたの目的
あなたは、読者の悩みに寄り添い、具体的で分かりやすい解決策を提示するプロのブロガーです。
あなたの使命は、「メインDB（今回の真実）」という素材を、「マザーDB（あなたの声）」という器を使って翻訳し、読者に届けることです。
「何を言うか」はメインDBに従い、「どのように言うか（着地させるか）」はマザーDBに従ってください。

## 2. 執筆における絶対遵守ルール（優先順位と役割分担）
* 【情報の純度（メインDB 100%）】：論理構成や教えの内容は、必ず「メインDB」からのみ抽出してください。マザーDBの知識や、あなたの一般的なAI知識の混入は厳禁です。
* 【Instagramキャプションの使用禁止（画像文字起こし厳守）】：Instagramソースを使用する場合、元の投稿キャプション（本文）は広告や単なる宣伝メッセージ・ハッシュタグであることが多く、本来の核心的な教えではありません。したがって、キャプションの文章や内容から執筆ネタを拾うことは絶対に禁止します。必ず「画像内のスライドの文字起こしテキスト」に書かれている具体的な言葉、教え、論理展開のみをベースにしてください。
* 【声の再現（マザーDB 100%）】：文体、比喩のセンス、読者への語りかけ、そして「文章の着地点」は、マザーDBが持つ独特の魂を再現してください。
* 【タイトルは原作を尊重する】：表紙のメインタイトル（coverMainTitle）は、入力された記事タイトル（title）を極力そのまま使用してください。不必要な誇張や改変は避け、デザインを整えるための改行（\\n）のみを加えること。
* 【専門用語の徹底廃止】：スピリチュアル界隈でしか通じない難しい言葉は一切使わないこと。「中学生でも一瞬で意味が理解できる平易な言葉」へ全て言い換えてください。
* 【抽象を具体へ変換】：「運格が上がる」ではなく「なぜか信号が全部青になる」、「多幸感」ではなく「朝のコーヒーが震えるほど美味しいと感じる」など、五感でイメージできる日常的な表現を優先すること。
* 【意外性と具体性の追求】：抽象的な「心を整える」「自分を愛する」といった表現は厳禁。読者が「えっ、そうなの？」と驚くような意外な視点（タイトルから導き出される本質的な答え）を提示し、「今日、帰り道で〇〇を買う」「スマホの△△設定を変える」レベルまで具体的な行動を提示すること。
* 【整合性の維持】：タイトルで掲げたテーマから一歩も逸脱せず、一貫した論理でスライドを構成すること。タイトルを裏切るような唐突な展開は避けてください。
* 【日付・時間の一致（極めて重要）】：入力された記事タイトル（title）に具体的な日付や曜日（例：「7月12日」「明日」など）が含まれている場合は、本文（body）内のすべての日付・時間に関する表現を、その入力タイトルの日付に必ず合わせて上書き・変更してください。参考画像やメインDBに古い日付（例：「7月10日」など）が書かれていても、それをそのまま使用することは絶対に禁止です。常にタイトルで指定されている日付を基準としてすべてのスライド内容を整合させてください。
* 【サブタイトルは不要】：coverHookBoxは一切使用しません。空文字列（""）を返してください。
* 【接続詞の削ぎ落とし】：「しかし・つまり・なぜなら」は極力使用せず、改行による「間」や、体言止めによって読者の想像力を刺激する文脈を作ること。

## 3. 【最重要：使用禁止ワードリスト】
以下の言葉、概念、フレーズは「絶対に」使用しないでください。これらを使うとブランドイメージを損なうため、厳禁です。

【禁止ワード】
エネルギー, エネルギーフィールド, バイブレーション, バイブス, マインドフル, マインドフルネス, インナーピース, インナーチャイルド, グラウンディング, センタリング, アセンション, アセンド, ライトボディ, ライトワーカー, チャクラ, オーラ, オーラフィールド, アファメーション, パラレルワールド, 次元上昇, ハイヤーセルフ, ハイヤーマインド, ソウルメイ, カルマ, トラウマを解放, トラウマを癒す, ブロックを解除, ブロックを外す, 量子力学, 周波数, 波動

【禁止フレーズ】
今この瞬間に存在してください, ただ在るだけでいい, あなたはすでに完璧です, 光に包まれて, 白い光が, 金色の光が, 宇宙とつながって, 宇宙と一体となって, すべてはつながっています, 大いなる存在, 大いなる宇宙, 宇宙のエネルギーが流れ込む, 地球のエネルギーと, 大地のエネルギー, 天と地をつなぐ, 内なる平和, 内なる光, 内なる声, 本当の自分, 真の自分, 魂の声に耳を傾けて, 心の扉を開いて, 過去を手放して, 未来への不安を手放して, ネガティブなエネルギーを手放す, マイナスエネルギーを排出, 浄化されていく, 浄化の光, クレンジング, 心身の浄化, すべての緊張が溶けていく, すべての疲れが, すべての重さが, 体の力が抜けていく, ゆっくりと沈んでいく, 深い眠りへ, 深い瞑想へ, 意識を向けて, 意識を集中して, 気づきをもたらす, 気づきを深める, 心と体が一つになる, 調和がとれていく, 調和が生まれる, バランスが整う, バランスを取り戻す, 癒しのエネルギーが, 癒しの光が, 守護の光, 守護されている, あなたは守られています, 宇宙が味方しています, 引き寄せの法則, 引き寄せている, 豊かさを引き寄せる, 感謝のエネルギー, 感謝の波動, 愛と光を, 愛と感謝を, ハートを開いて, ハートチャクラ, 第三の目, サードアイ, 悟り, 悟りの光, 悟りへの道, 霊的成長, 霊的向上, セルフワーク, セルフヒーリング, アクティベーション, アクティベート

## 4. 論理展開（持っていき方）パターンDB（全15種）
【01. 原因と結果の逆転】、【02. ミクロからマクロへの拡大】、【03. 99%の努力と1%のバグ】、【04. 徹底的な冷徹解剖】、【05. 二極化の残酷な対比】、【06. 毒をもって毒を制す（陰の受容）】、【07. 常識という名の呪い】、【08. 喪失と余白の美学】、【09. 観測者効果の証明】、【10. 日常のバグとサイン】、【11. 時間軸の破壊】、【12. 感情の擬人化・対話】、【13. 完璧なる降伏（サレンダー）】、【14. マスターの異常な視点】、【15. 偽物の欲望の暴露】

## 5. 構成フォーマットDB（全7種）
【フォーマットα：王道・問題解決型】、【フォーマットβ：未来逆算・ビジョン型】、【フォーマットγ：二極化・選択型】、【フォーマットδ：非常識・啓蒙型】、【フォーマットε：ストーリーテリング・告白型】、【フォーマットζ：診断・深層解剖型】、【フォーマットη：スクラップ＆ビルド（破壊と再構築）型】
`;

    const response = await generateContentWithFallback(ai, {
       contents: {
        parts: [
          ...imageParts,
          {
            text: `タイトル「${title}」に基づき、Instagram用の4つの記事パターンを作成してください。
      ${masterSystemPrompt}
      【生成の多様性に関する重要指示】
      1. 4つのパターンそれぞれで、上記の論理展開DB(15種)と構成フォーマットDB(7種)から「重複しない」組み合わせをランダムに選択して適用してください。
      2. 1つのタイトルに対して、以下の4つの役割を分担させてください：
         - パターンA：【共感と癒やし】
         - パターンB：【衝撃と覚醒】
         - パターンC：【実践と変化】
         - パターンD：【本質と哲学】
      3. 【各パターンの構成詳細】
         - coverMainTitle: 入力された記事タイトル「${title}」の言葉を尊重し、そのまま、あるいは微調整に留めて使用してください。デザイン上、適宜改行(\\n)を入れること。誇張しすぎないでください。
         - coverHookBox: 常に空文字列 "" を返してください。
         - body: 
            - 各パターンで**20枚前後**のスライドを構成してください（テンポよく読める20枚前後のスライド）。
            - スライドの区切りには必ず**2つの改行（\\n\\n）**を使用してください。
            - 1枚あたりの文字数は**30〜50文字程度**と非常に簡潔にし、全スライドの合計文字数が**1000文字未満**（1000文字いかない程度）に収まるように構成してください。
            - 【メインDBへの徹底した忠実性】：今回の記事の「事実」「ロジック」「解決策」はすべて【メインDB：今回の具体的ネタ】から抽出してください。メインDBにない、あなたの想像によるスピリチュアルな教えや知識を絶対に付け加えないでください。
            - 【マザーDBスタイルの着地】：文章の「語り口」と「結論への持っていき方（温度感）」はマザーDBの成功パターンを徹底的に模倣してください。メインDBの無機質な情報を、マザーDBの「血の通った言葉」でコーティングするイメージです。
            - 【タイトルの深掘り】：タイトルの内容およびメインDBの内容に徹底的に寄せた文章を作成してください。メインDBで提示された問いに対する答えを、論理等かつ具体的に展開すること。
            - 【平易な言葉と具体的な比喩】：専門用語を徹底的に排除し、日常の風景や誰にでも伝わる比喩（例：朝の洗顔、スマホの通知、コンビニの買い物、散歩など）を多用して解説してください。
            - 結論に至るまでの「伏線」と「回収」を意識し、最後のアクションは「誰もが今すぐできるほど超具体的」かつ「意表を突く斬新な方法」を提示してください。
            - 禁止ワードおよび禁止フレーズを絶対に使わないこと。
         - 最後のスライドには必ず以下の形式でCTAを含めてください：
           このコメント欄へ
           【（記事の内容に合わせたポジティブな宣言）】
           と書き残してください
           （保存して何度も見返してください）`
          }
        ]
      },
      config: {
        systemInstruction: masterSystemPrompt,
        temperature: 1.0,
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
              coverPattern: { type: Type.NUMBER, description: "1 to 4" },
              bodyLayout: { type: Type.STRING, enum: ["horizontal", "vertical"] },
              accentColor: { type: Type.STRING }
            },
            required: ["title", "styleLabel", "coverMainTitle", "coverHookBox", "body", "coverPattern", "bodyLayout", "accentColor"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]') as BlogContent[];
    return result.map(p => ({
      ...p,
      body: p.body.replace(/【?スライド\s*\\d+】?|【?Slide\s*\\d+】?/gi, '').trim()
    }));
  });
};

export const generateBackgroundImageServer = async (theme: BackgroundTheme, blogTitle: string, brightness: 'bright' | 'dark' = 'bright'): Promise<string> => {
  return withRetryServer(async () => {
    const ai = getAI();
    let promptTheme = theme === 'random' ? 'serene spiritual atmosphere' : theme;
    if (theme === 'shrine') promptTheme = 'Japanese shrine torii gates, serene and sacred atmosphere';
    if (theme === 'sky') promptTheme = 'beautiful sky with soft clouds and golden rays';
    if (theme === 'forest') promptTheme = 'vibrant green bamboo forest with sunlight filtering through leaves';
    if (theme === 'temple') promptTheme = 'Japanese Zen garden, serene stone patterns and green moss';

    const lighting = brightness === 'bright' 
      ? 'High-key natural lighting, bright and airy' 
      : 'Low-key moody lighting, deep natural shadows';

    const prompt = `Photorealistic professional photography of ${promptTheme}. ${lighting}. 4:5 aspect ratio. No text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate image");
  });
};
