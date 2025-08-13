# Social Multi-Poster

A ready-to-run repo to compose a single post and publish concurrently to LinkedIn, Facebook Pages, Twitter (X), and Instagram (Business/Creator).

## Quick start

1. Prereqs: Node.js 18+
2. Backend env:
   - Copy `backend/.env.example` to `backend/.env` and fill values.
   - Use strong random values for `SESSION_SECRET` and `ENCRYPTION_SECRET`.
3. App configs (provider dashboards):
   - LinkedIn: Add redirect URI `http://localhost:3000/auth/linkedin/callback`, request scopes `r_liteprofile` and `w_member_social`.
   - Facebook/Instagram: Add redirect URI `http://localhost:3000/auth/facebook/callback`, request `pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish`.
   - Twitter (X): Add redirect URI `http://localhost:3000/auth/twitter/callback`, scopes `tweet.read tweet.write users.read offline.access`.
4. Install deps:
```bash
npm install
npm run install:all
```
5. Run dev (backend: 3000, frontend: 5173):
```bash
npm run dev
```
6. Open the app: http://localhost:5173

## Features
- OAuth for LinkedIn, Facebook/Instagram, Twitter (X)
- Compose once: text, optional link and image URL
- Concurrent posting with per-platform success/failure
- Encrypted token storage in SQLite (`backend/data/app.sqlite`)

## Limitations & notes
- Facebook: posting is to Pages only, not personal profiles.
- Instagram: Business/Creator account linked to a Page is required; image is mandatory.
- Twitter: write access requires appropriate API access tier.

## Project structure
- `backend/` Node/Express, SQLite (Sequelize), providers per platform
- `frontend/` Vite + React UI