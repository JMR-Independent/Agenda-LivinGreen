# IMPORTANT: OpenAI OCR Setup Instructions

## ⚠️ API Key Security
The OpenAI API key has been removed from the client code for security.
To use OCR functionality, you MUST set up the backend proxy.

## Local Development Setup

1. **Create `.env` file** in project root:
```bash
OPENAI_API_KEY=your-actual-openai-api-key-here
```

2. **Install Vercel CLI** (if not installed):
```bash
npm i -g vercel
```

3. **Run local development server**:
```bash
vercel dev
```

4. **Access the app at**: `http://localhost:3000`

## Production Deployment (Vercel)

1. Deploy to Vercel (or push to GitHub if auto-deploy is enabled)

2. Add environment variable in Vercel dashboard:
   - Go to: Project Settings → Environment Variables
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Apply to: Production, Preview, Development

3. Redeploy if needed

## How It Works

- **Backend**: `/api/openai-vision.js` securely proxies requests to OpenAI
- **Client**: `index.html` calls the backend API (no exposed keys)
- **Security**: API key stays on server, never exposed to browser

## Changes Made

✅ Enhanced OpenAI prompt for better name & date extraction
✅ Added `specificDate` field for precise dates
✅ Removed all Tesseract.js and Google Vision code  
✅ Removed hardcoded API keys (security fix)
✅ Backend proxy required for OCR functionality
