
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { ApifyClient } from 'apify-client';
import {
  transcribeImagesServer,
  extractTitleFromImageServer,
  generateBlogPatternsServer,
  generateBackgroundImageServer
} from "./services/geminiService.server.js";

dotenv.config();

const _filename = typeof __filename !== "undefined"
  ? __filename
  : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "");

const _dirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(_filename || process.cwd());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for Instagram Scraping
  app.post("/api/scrape-instagram", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      return res.status(500).json({ 
        error: "APIFY_API_TOKENが設定されていません。設定メニューからAPIキーを追加してください。",
        details: "Apify API Token is missing in environment variables."
      });
    }

    try {
      const client = new ApifyClient({ token });
      // Clean URL to remove tracking parameters
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      console.log(`Scraping Instagram URL: ${cleanUrl}`);
      
      // Extract potential username from URL
      let extractedUsername = "";
      try {
        const urlObj = new URL(cleanUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        // If it's a profile URL, the first part is the username
        if (pathParts.length > 0 && !['p', 'reels', 'tv', 'stories', 'explore'].includes(pathParts[0])) {
          extractedUsername = pathParts[0];
        } else if (pathParts.length > 1 && ['p', 'reels', 'tv'].includes(pathParts[0])) {
          // Sometimes we can find the username in the second part if it's a specific format, 
          // but usually not for /p/ URLs.
        }
      } catch (e) {
        console.warn("Failed to parse URL for username extraction:", e);
      }

      // Determine which actor to use based on URL
      const isPostUrl = cleanUrl.includes('/p/') || cleanUrl.includes('/reels/') || cleanUrl.includes('/tv/');
      
      let items: any[] = [];
      const targetUsername = extractedUsername || "instagram";
      
      // Attempt 1: Try the most specific scraper first
      try {
        if (isPostUrl) {
          console.log("Detected post URL, attempting instagram-post-scraper...");
          const input = {
            "directUrls": [cleanUrl],
            "resultsLimit": 1,
            "proxyConfiguration": { 
              "useApifyProxy": true,
              "groups": ["RESIDENTIAL"]
            }
          };
          console.log("Input for instagram-post-scraper:", JSON.stringify(input));
          const run = await client.actor("apify/instagram-post-scraper").call(input);
          const result = await client.dataset(run.defaultDatasetId).listItems();
          items = result.items;
        }
      } catch (postScrapeError: any) {
        console.warn("instagram-post-scraper failed, will try general scraper:", postScrapeError.message);
      }
      
      // Attempt 2: If not a post URL or if first attempt failed/returned nothing, try the general scraper
      if (items.length === 0) {
        console.log(`Using general instagram-scraper. Target username: ${targetUsername}`);
        
        const input = {
          "directUrls": [cleanUrl],
          "username": [targetUsername],
          "usernames": [targetUsername],
          "resultsLimit": 1,
          "resultsType": "details",
          "searchLimit": 1,
          "proxyConfiguration": { 
            "useApifyProxy": true,
            "groups": ["RESIDENTIAL"] 
          }
        };
        
        console.log("Input for instagram-scraper:", JSON.stringify(input));
        try {
          const run = await client.actor("apify/instagram-scraper").call(input);
          const result = await client.dataset(run.defaultDatasetId).listItems();
          items = result.items;
        } catch (scrapeError: any) {
          console.error("Error calling instagram-scraper:", scrapeError.message);
          // If it still fails with username error, try one more time with a different format
          if (scrapeError.message.includes('username') || items.length === 0) {
             console.log("Final attempt with simplified input for instagram-scraper...");
             const retryInput = {
               "username": [targetUsername],
               "usernames": [targetUsername],
               "resultsLimit": 1,
               "proxyConfiguration": { 
                 "useApifyProxy": true,
                 "groups": ["RESIDENTIAL"]
               }
             };
             console.log("Input for final attempt:", JSON.stringify(retryInput));
             try {
               const retryRun = await client.actor("apify/instagram-scraper").call(retryInput);
               const retryResult = await client.dataset(retryRun.defaultDatasetId).listItems();
               items = retryResult.items;
             } catch (finalError: any) {
               console.error("Final attempt failed:", finalError.message);
               throw finalError;
             }
          } else {
            throw scrapeError;
          }
        }
      }

      if (items.length === 0) {
        console.error("Apify returned 0 items for URL:", cleanUrl);
        return res.status(404).json({ error: "投稿データが見つかりませんでした。非公開アカウントの投稿、または削除された投稿の可能性があります。" });
      }

      const post = items[0] as any;
      console.log("Scraped post data keys:", Object.keys(post));
      
      // Extracting all images (Extreme robustness for various API versions)
      let images: string[] = [];
      
      // 1. Check for childPosts (Standard for Carousels)
      if (post.childPosts && Array.isArray(post.childPosts)) {
        images = post.childPosts.map((child: any) => child.displayUrl || child.display_url || child.videoUrl || child.video_url).filter(Boolean);
      } 
      // 2. Check for sidecarGraph
      else if (post.sidecarGraph && Array.isArray(post.sidecarGraph)) {
        images = post.sidecarGraph.map((item: any) => item.display_url || item.displayUrl || item.video_url || item.videoUrl).filter(Boolean);
      }
      // 3. Check for resources (Another common format)
      else if (post.resources && Array.isArray(post.resources)) {
        images = post.resources.map((res: any) => res.src || res.display_url || res.displayUrl || res.video_url || res.videoUrl).filter(Boolean);
      }
      // 4. Check for 'images' array
      else if (post.images && Array.isArray(post.images)) {
        images = post.images;
      }
      // 5. Check for carousel_media (Instagram API native format)
      else if (post.carousel_media && Array.isArray(post.carousel_media)) {
        images = post.carousel_media.map((m: any) => 
          m.image_versions2?.candidates?.[0]?.url || 
          m.video_versions?.[0]?.url ||
          m.display_url
        ).filter(Boolean);
      }
      
      // 6. Fallback to main displayUrl/display_url
      const mainImg = post.displayUrl || post.display_url || post.thumbnailUrl || post.thumbnail_url || post.image_versions2?.candidates?.[0]?.url;
      if (images.length === 0 && mainImg) {
        images = [mainImg];
      }

      // 7. Last resort: videoUrl
      if (images.length === 0 && (post.videoUrl || post.video_url)) {
        images = [post.videoUrl || post.video_url];
      }

      const result = {
        caption: post.caption || post.text || post.description || post.accessibility_caption || "",
        images: images,
        ownerUsername: post.ownerUsername || post.owner?.username || post.username || post.user?.username || "unknown",
        timestamp: post.timestamp || post.latest_published_at || post.taken_at_timestamp,
        url: post.url || (post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : cleanUrl)
      };

      if (result.images.length === 0) {
        console.warn("No images found in post data. Full post object keys:", Object.keys(post));
      }

      res.json(result);
    } catch (error: any) {
      console.error("Apify Scraping Error:", error);
      res.status(500).json({ error: error.message || "Failed to scrape Instagram" });
    }
  });

  // API Route for General URL Scraping (Blogs like note.com)
  app.post("/api/scrape-url", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      return res.status(500).json({ 
        error: "APIFY_API_TOKENが設定されていません。",
        details: "Apify API Token is missing."
      });
    }

    try {
      const client = new ApifyClient({ token });
      console.log(`Scraping General URL: ${url}`);
      
      // Using Website Content Crawler which is excellent for RAG and clean text extraction
      const input = {
        "startUrls": [{ "url": url }],
        "maxPagesPerCrawl": 1,
        "proxyConfiguration": { "useApifyProxy": true },
        "crawlerType": "cheerio" // Faster and usually enough for text extraction
      };
      
      const run = await client.actor("apify/website-content-crawler").call(input);
      const result = await client.dataset(run.defaultDatasetId).listItems();
      const items = result.items;

      if (items.length === 0) {
        return res.status(404).json({ error: "ページの内容が取得できませんでした。" });
      }

      const item = items[0] as any;
      
      // Website Content Crawler usually returns 'text', 'markdown' or 'markdownContent'
      const content = item.markdownContent || item.text || item.markdown || item.description || "";
      const title = item.metadata?.title || item.title || "";
      const author = item.metadata?.author || item.author || "";

      res.json({
        title: title,
        content: content,
        author: author,
        url: url
      });
    } catch (error: any) {
      console.error("General Scraping Error:", error);
      res.status(500).json({ error: error.message || "Failed to scrape URL" });
    }
  });

  // API Route for Transcribe Images
  app.get("/api/diag", (req, res) => {
    const envKeys = Object.keys(process.env);
    const diagInfo: Record<string, { length: number; prefix: string; suffix: string; looksValid: boolean }> = {};
    
    envKeys.forEach(key => {
      const upperKey = key.toUpperCase();
      if (upperKey.includes("GEMINI") || upperKey.includes("API") || upperKey.includes("KEY") || upperKey.includes("TOKEN")) {
        const val = process.env[key] || "";
        diagInfo[key] = {
          length: val.length,
          prefix: val.length > 4 ? val.substring(0, 6) : "...",
          suffix: val.length > 4 ? val.substring(val.length - 4) : "...",
          looksValid: val.startsWith("AIzaSy") || val.length > 20
        };
      }
    });

    res.json({
      envKeys,
      diagInfo,
      nodeEnv: process.env.NODE_ENV,
    });
  });

  // API Route for Transcribe Images
  app.post("/api/transcribe-images", async (req, res) => {
    const { imageUrls } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: "imageUrls array is required" });
    }
    try {
      const text = await transcribeImagesServer(imageUrls);
      res.json({ text });
    } catch (error: any) {
      console.error("Transcribe images error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe images" });
    }
  });

  // API Route for Extract Title from Image
  app.post("/api/extract-title-from-image", async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }
    try {
      const title = await extractTitleFromImageServer(imageUrl);
      res.json({ title });
    } catch (error: any) {
      console.error("Extract title error:", error);
      res.status(500).json({ error: error.message || "Failed to extract title" });
    }
  });

  // API Route for Generate Blog Patterns
  app.post("/api/generate-blog-patterns", async (req, res) => {
    const { title, sources, guidelines, history, selectedDrafts } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    try {
      const patterns = await generateBlogPatternsServer(title, sources, guidelines, history, selectedDrafts);
      res.json({ patterns });
    } catch (error: any) {
      console.error("Generate blog patterns error:", error);
      res.status(500).json({ error: error.message || "Failed to generate blog patterns" });
    }
  });

  // API Route for Generate Background Image
  app.post("/api/generate-background-image", async (req, res) => {
    const { theme, blogTitle, brightness } = req.body;
    if (!theme || !blogTitle) {
      return res.status(400).json({ error: "theme and blogTitle are required" });
    }
    try {
      const imageUrl = await generateBackgroundImageServer(theme, blogTitle, brightness);
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Generate background image error:", error);
      res.status(500).json({ error: error.message || "Failed to generate background image" });
    }
  });

  // Image Proxy to bypass Instagram hotlinking protection
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("URL is required");

    try {
      // Use a very basic set of headers that mimics a standard browser GET request for static assets
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site"
        }
      });
      
      if (!response.ok) {
        // If the first attempt failed, try a truly minimal fetch as fallback
        console.warn(`Initial proxy attempt failed: ${response.status}. Trying minimal headers...`);
        const fallbackResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          }
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Failed to fetch image: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }
        
        const buffer = await fallbackResponse.arrayBuffer();
        const contentType = fallbackResponse.headers.get("content-type") || "image/jpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(buffer));
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Failed to proxy image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler to ensure JSON responses
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
}

startServer();
