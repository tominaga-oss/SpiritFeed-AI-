import { BlogContent, BackgroundTheme, Source, BrandGuidelines } from "../types";

export const transcribeImages = async (imageUrls: string[]): Promise<string> => {
  const response = await fetch('/api/transcribe-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrls })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to transcribe images');
  }
  const data = await response.json();
  return data.text;
};

export const extractTitleFromImage = async (imageUrl: string): Promise<string> => {
  const response = await fetch('/api/extract-title-from-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to extract title from image');
  }
  const data = await response.json();
  return data.title;
};

export const generateBlogPatterns = async (
  title: string, 
  sources: Source[] = [], 
  guidelines?: BrandGuidelines, 
  history: string[] = [], 
  selectedDrafts: any[] = []
): Promise<BlogContent[]> => {
  const response = await fetch('/api/generate-blog-patterns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sources, guidelines, history, selectedDrafts })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate blog patterns');
  }
  const data = await response.json();
  return data.patterns;
};

export const generateBackgroundImage = async (
  theme: BackgroundTheme, 
  blogTitle: string, 
  brightness: 'bright' | 'dark' = 'bright'
): Promise<string> => {
  const response = await fetch('/api/generate-background-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, blogTitle, brightness })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate background image');
  }
  const data = await response.json();
  return data.imageUrl;
};

export const generateBackgroundOptions = async (
  theme: BackgroundTheme, 
  blogTitle: string, 
  brightness: 'bright' | 'dark' = 'bright', 
  count: number = 4
): Promise<string[]> => {
  const tasks = Array.from({ length: count }, () => generateBackgroundImage(theme, blogTitle, brightness));
  return Promise.all(tasks);
};
