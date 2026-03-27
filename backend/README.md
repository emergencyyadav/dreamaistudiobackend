# Backend

This backend is the safe deployment boundary for the app.

What belongs here:
- AI provider keys and chat generation
- Cloudinary search
- ElevenLabs text-to-speech
- Solana address derivation and payment confirmation
- Supabase service-role writes

What should stay in the frontend:
- Supabase anon auth/session usage
- UI state
- Rendering and optimistic UX

## Run locally

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in the server-only secrets
3. Start the server:

```bash
cd backend
npm run dev
```

4. In `my-app/.env`, set:

```bash
VITE_BACKEND_URL=http://localhost:4000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deployment checklist

- Never put provider secrets in `VITE_` variables
- Rotate any keys that were previously exposed in frontend code or generated files
- Set `ALLOWED_ORIGINS` to your production frontend origin
- Use a Supabase service role only on the backend
- Keep Solana seed material only on the backend
- Add upstream/provider rate limits at the platform edge if available
