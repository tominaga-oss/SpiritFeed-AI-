import dotenv from 'dotenv';
dotenv.config();
console.log("ENV_KEYS:", Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API") || k.includes("KEY")));
console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : "undefined");
console.log("API_KEY length:", process.env.API_KEY ? process.env.API_KEY.length : "undefined");
