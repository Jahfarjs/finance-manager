# Deploy Backend API on Render

This guide covers hosting **only the backend API** of this project on [Render](https://render.com). The frontend can stay on Netlify, Vercel, or elsewhere and call this API.

## Prerequisites

- GitHub (or GitLab) repo with your code pushed
- [Render](https://render.com) account
- **MongoDB** database (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) free tier) — Render does not provide MongoDB

## 1. MongoDB

Your app uses **MongoDB** (via Mongoose). You need a MongoDB URI from one of:

- **MongoDB Atlas** (recommended): Create a free cluster, get a connection string like  
  `mongodb+srv://user:password@cluster.mongodb.net/yourdb?retryWrites=true&w=majority`
- Any other MongoDB host that gives you a `MONGODB_URI`

Keep this URI for the next step.

## 2. Deploy on Render

### Option A: Using the Blueprint (`render.yaml`)

1. In [Render Dashboard](https://dashboard.render.com), click **New** → **Blueprint**.
2. Connect your Git provider and select the repo that contains this project.
3. Render will detect `render.yaml`. Confirm the **fm-backend-api** service.
4. When prompted, set:
   - **MONGODB_URI**: your MongoDB connection string (e.g. from Atlas).
   - **ALLOWED_ORIGINS**: your frontend URL(s), comma-separated, e.g.  
     `https://your-app.netlify.app` or `https://your-app.netlify.app,https://yourdomain.com`
5. **JWT_SECRET**: Render can auto-generate one; use that or paste your own (e.g. from `openssl rand -base64 32`).
6. Create the Blueprint. Render will build and deploy.

### Option B: Manual Web Service

1. In [Render Dashboard](https://dashboard.render.com), click **New** → **Web Service**.
2. Connect the repo and select the same branch you use for deploys.
3. Configure:
   - **Name**: e.g. `fm-backend-api`
   - **Region**: choose one (e.g. Oregon)
   - **Branch**: e.g. `main`
   - **Runtime**: **Node**
   - **Build Command**: `npm install && npm run build:backend`
   - **Start Command**: `npm start`
   - **Instance type**: Free or paid as needed
4. Under **Environment**, add the variables from the table below.
5. Click **Create Web Service**.

## 3. Required environment variables (Render)

Set these in the Render service **Environment** tab:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT signing. Generate with: `openssl rand -base64 32` |
| `MONGODB_URI` | Yes | Full MongoDB connection string (e.g. from Atlas) |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs, e.g. `https://your-app.netlify.app` |
| `NODE_ENV` | Recommended | Set to `production` |
| `FRONTEND_HOSTED_SEPARATELY` | Recommended | Set to `true` so the API does not serve static frontend files |
| `PORT` | No | Render sets this automatically; your app already uses `process.env.PORT` |

**CORS:** The server allows origins listed in `ALLOWED_ORIGINS`. Add every frontend URL (including custom domains) that will call the API.

## 4. After deploy

1. **Backend URL**  
   Render will show a URL like:  
   `https://fm-backend-api.onrender.com`

2. **Frontend config**  
   Wherever the frontend is built (e.g. Netlify), set:
   ```bash
   VITE_API_BASE_URL=https://fm-backend-api.onrender.com
   ```
   (No trailing slash; the client will append `/api`.)

3. **Update CORS**  
   If you add a new frontend URL or domain, add it to `ALLOWED_ORIGINS` in Render and redeploy if needed.

## 5. Project updates already in place

- **`render.yaml`** — Defines the backend as a Node Web Service with build/start commands and env var placeholders (`sync: false` / `generateValue` for secrets).
- **Port** — The server uses `process.env.PORT` (Render sets this) and binds to `0.0.0.0`.
- **Startup message** — The JWT_SECRET error message now refers to “Render or your host” instead of only Railway.

No code changes are required for Render beyond what’s in the repo; just set the environment variables above.

## 6. Optional: health check

For zero-downtime deploys, you can add a health route and set **Health Check Path** in Render (e.g. `/api/health`). The current codebase doesn’t expose one; you can add a simple GET route that returns 200 if the app and DB are up.

## 7. Free tier notes

- Render’s free tier may spin down the service after inactivity; the first request after that can be slow (cold start).
- Use a paid plan if you need always-on and no cold starts.

## Summary checklist

- [ ] MongoDB (e.g. Atlas) created and `MONGODB_URI` copied
- [ ] Render Web Service created (Blueprint or manual)
- [ ] `JWT_SECRET`, `MONGODB_URI`, `ALLOWED_ORIGINS` set in Render
- [ ] `NODE_ENV=production` and `FRONTEND_HOSTED_SEPARATELY=true` set
- [ ] Frontend’s `VITE_API_BASE_URL` set to the Render backend URL
- [ ] `ALLOWED_ORIGINS` includes all frontend origins (no trailing slash)

For frontend deployment (e.g. Netlify), see **DEPLOYMENT.md**.
