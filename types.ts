
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
}

export type BackgroundTheme = 'shrine' | 'sky' | 'forest' | 'temple' | 'random';
export type BackgroundBrightness = 'bright' | 'dark';

export interface AppState {
  step: 'generate-text' | 'select-pattern' | 'design-select' | 'preview-export';
  patterns: BlogContent[] | null;
  selectedPatternIndex: number | null;
  generatedImageUrl: string | null;
  selectedTheme: BackgroundTheme;
  selectedBrightness: BackgroundBrightness;
  isGenerating: boolean;
}
