
export interface BlogContent {
  title: string;
  styleLabel: string;
  // Slide 1: Cover elements
  coverMainTitle: string; // Should be split by \n into 3 lines
  coverHookBox: string;   
  coverPattern: number;   // 1 to 4
  // Following: Detailed body
  body: string;           
  
  // Styling preferences
  bodyLayout: 'horizontal' | 'vertical';
  accentColor: string;
  generatedAt?: number;

  // Design customization
  titleStyle?: {
    fontSize: number;
    fontFamily: string;
    effect: 'none' | 'shadow' | 'outline' | 'neon';
    color: string;
  };
}

export type BackgroundTheme = 'shrine' | 'sky' | 'forest' | 'temple' | 'random' | 'custom';
export type BackgroundBrightness = 'bright' | 'dark';

export interface Source {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'file' | 'instagram' | 'blog';
  createdAt: number;
  metadata?: {
    images?: string[];
    url?: string;
    username?: string;
    author?: string;
    caption?: string;
  };
}

export interface BrandGuidelines {
  forbiddenWords: string[];
  recommendedWords: string[];
  structure: string;
  tone: string;
}

export interface AppState {
  step: 'generate-text' | 'select-pattern' | 'design-select' | 'preview-export';
  patterns: BlogContent[] | null;
  selectedPatternIndex: number | null;
  generatedImageUrl: null | string;
  customImageUrl: string | null;
  selectedTheme: BackgroundTheme;
  selectedBrightness: BackgroundBrightness;
  isGenerating: boolean;
  sources: Source[];
  selectedSourceIds: string[];
  selectedDraftIds: string[];
  brandGuidelines: BrandGuidelines;
  generationHistory: string[]; // List of recently generated style labels or titles to avoid repetition
}
