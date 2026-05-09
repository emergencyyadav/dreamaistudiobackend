# DreamAI - Full Stack Application

This repository contains the DreamAI application, with both the frontend and the production backend.

## Repo Layout
- `my-app/` - React frontend application.
- `backend/` - Local backend source code.
- `server.mjs` - Production backend entry point (at root for Railway compatibility).

## Backend Features
- AI provider integration (llama-3.3, gemini-2.5) via Groq and Google.
- CryptoGate payment gateway integration with automatic webhook fulfillment.
- Cloudinary search and asset management.
- ElevenLabs high-fidelity text-to-speech.
- Solana/Tron/Base address derivation and payment confirmation.

## Local Development

### 1. Backend Setup
1. Ensure you have a `.env` file at the root or in the `backend/` folder.
2. Install dependencies: `npm install`
3. Start the server: `npm run dev`

### 2. Frontend Setup
1. Navigate to `my-app/`.
2. Install dependencies: `npm install`
3. Start the app: `npm run dev`

## Deployment Checklist
- **Backend (Railway)**: Deploy from the root of this repository.
- **Frontend (Netlify/Vercel)**: Set the root directory to `my-app`.
- **Secrets**: Never commit `.env` files. Use platform environment variables.
