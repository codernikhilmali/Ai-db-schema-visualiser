import { GoogleGenerativeAI } from '@google/generative-ai';

import fs from 'fs';
import path from 'path';

let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../ai-based-schema-visualiser/.env'),
    path.resolve(process.cwd(), 'ai-based-schema-visualiser/.env')
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/GEMINI_API_KEYS\s*=\s*([^#\r\n]+)/);
      if (match) {
        apiKey = match[1].split(',')[0].trim();
        break;
      }
    }
  }
}

if (!apiKey) {
  console.warn("⚠️ Warning: No GEMINI_API_KEYS found in environment or local .env files. Using dummy key.");
  apiKey = "DUMMY_KEY_FOR_DEVELOPMENT";
}

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      console.log(data.models.map(m => m.name));
    } else {
      console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}

listModels();
