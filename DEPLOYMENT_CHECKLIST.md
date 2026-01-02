# 🚀 Quick Deployment Checklist

## Before You Start

- [ ] Install new dependencies: `npm install` (to get `cors` package)
- [ ] Test builds locally:
  - `npm run build:frontend` (should create `dist/public`)
  - `npm run build:backend` (should create `dist/index.cjs`)
- [ ] Push all changes to GitHub

## Backend Setup (Railway)

1. [ ] Create Railway account
2. [ ] Create new project from GitHub repo
3. [ ] Add PostgreSQL database service
4. [ ] Set environment variables:
   - `SESSION_SECRET` (generate with `openssl rand -base64 32`)
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `PORT=${{PORT}}`
   - `NODE_ENV=production`
   - `FRONTEND_HOSTED_SEPARATELY=true`
   - `ALLOWED_ORIGINS` (add after getting Netlify URL)
5. [ ] Verify build command: `npm run build:backend`
6. [ ] Verify start command: `npm start`
7. [ ] Copy backend URL (e.g., `https://xxx.up.railway.app`)

## Frontend Setup (Netlify)

1. [ ] Create Netlify account
2. [ ] Import project from GitHub
3. [ ] Set environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url.up.railway.app`
4. [ ] Verify build command: `npm run build:frontend`
5. [ ] Verify publish directory: `dist/public`
6. [ ] Deploy and copy frontend URL (e.g., `https://xxx.netlify.app`)

## Post-Deployment

1. [ ] Update Railway `ALLOWED_ORIGINS` with Netlify URL
2. [ ] Test frontend → backend connection
3. [ ] Run database migrations (if using PostgreSQL):
   ```bash
   railway run npm run db:push
   ```
4. [ ] Test login/signup functionality
5. [ ] Verify CORS is working (check browser console)

## Important Notes

⚠️ **Current Limitation**: Your app uses in-memory storage. Data will be lost on server restart until you:
- Set up PostgreSQL database
- Implement database storage layer (replace `MemStorage` with database queries)

📝 **Environment Variables**:
- Railway needs: `SESSION_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`
- Netlify needs: `VITE_API_BASE_URL`

🔒 **Security**:
- Never commit `.env` files
- Use strong `SESSION_SECRET`
- Keep `ALLOWED_ORIGINS` specific to your domain

