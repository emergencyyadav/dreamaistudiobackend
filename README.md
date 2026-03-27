# DreamAI

Repo layout:

- `my-app/` frontend app
- `backend/` private backend for AI, payments, and server-only secrets
- `image-proxy-server/` legacy proxy code kept for reference only

Safe upload rules:

- Never commit `backend/.env`
- Never commit `my-app/.env`
- Keep real secrets only in Railway/Netlify environment variables
- Use `.env.example` files as the template for setup

Recommended test deployment:

- Frontend: Netlify with root directory `my-app`
- Backend: Railway with root directory `backend`
- Auth/DB: Supabase
