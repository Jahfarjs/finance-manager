# Deployment Guide: Netlify (Frontend) + Railway (Backend)

This guide will help you deploy your Finance Manager application with the frontend on Netlify and the backend on Railway.

## 📋 Prerequisites

- GitHub account (for connecting repositories)
- Netlify account (free tier available)
- Railway account (free tier available)
- PostgreSQL database (Railway provides this)

## 🗄️ Database Setup

**IMPORTANT**: Your app currently uses in-memory storage. You need to set up a PostgreSQL database before deployment.

### Option 1: Railway PostgreSQL (Recommended)

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will automatically create a PostgreSQL database
5. Copy the `DATABASE_URL` from the database service (you'll need this later)

### Option 2: External PostgreSQL

You can use any PostgreSQL provider (Supabase, Neon, AWS RDS, etc.) and use their connection string.

## 🚂 Backend Deployment on Railway

### Step 1: Prepare Your Repository

1. Make sure your code is pushed to GitHub
2. Ensure `.env` is in `.gitignore` (it should be already)

### Step 2: Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect it's a Node.js project

### Step 3: Configure Railway Service

1. **Add PostgreSQL Database:**
   - In your Railway project, click "New" → "Database" → "PostgreSQL"
   - Railway will create a database and provide `DATABASE_URL`

2. **Configure Environment Variables:**
   - Go to your backend service → "Variables" tab
   - Add the following environment variables:

   ```bash
   # Required
   SESSION_SECRET=your-super-secret-jwt-key-here
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Use Railway's variable reference
   PORT=${{PORT}}  # Railway automatically provides this
   NODE_ENV=production
   FRONTEND_HOSTED_SEPARATELY=true
   
   # CORS - Add your Netlify frontend URL here (you'll get this after deploying frontend)
   ALLOWED_ORIGINS=https://your-app-name.netlify.app
   ```

3. **Generate SESSION_SECRET:**
   ```bash
   # Run this locally to generate a secure secret
   openssl rand -base64 32
   # Or
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Configure Build Settings:**
   - Railway should auto-detect, but verify:
     - **Build Command**: `npm run build:backend`
     - **Start Command**: `npm start`
     - **Root Directory**: `/` (root of your repo)

### Step 4: Get Your Backend URL

After deployment, Railway will provide a URL like:
- `https://your-backend-name.up.railway.app`

**Save this URL** - you'll need it for the frontend configuration.

### Step 5: Run Database Migrations

If you're using Drizzle ORM with PostgreSQL:

1. SSH into Railway or use Railway CLI:
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link to your project
   railway link
   
   # Run migrations
   railway run npm run db:push
   ```

## 🌐 Frontend Deployment on Netlify

### Step 1: Prepare Build Configuration

The `netlify.toml` file is already configured. Make sure:
- `netlify.toml` is in your repository root
- Frontend build script exists: `npm run build:frontend`

### Step 2: Deploy to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository

### Step 3: Configure Build Settings

Netlify should auto-detect from `netlify.toml`, but verify:

- **Build command**: `npm run build:frontend`
- **Publish directory**: `dist/public`
- **Node version**: 18 or 20 (set in Netlify settings if needed)

### Step 4: Configure Environment Variables

1. Go to Site settings → Environment variables
2. Add:

   ```bash
   VITE_API_BASE_URL=https://your-backend-name.up.railway.app
   ```

   **Important**: Replace `your-backend-name.up.railway.app` with your actual Railway backend URL.

### Step 5: Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Netlify will provide a URL like: `https://your-app-name.netlify.app`

### Step 6: Update Backend CORS

After getting your Netlify URL:

1. Go back to Railway → Your backend service → Variables
2. Update `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://your-app-name.netlify.app
   ```
3. Railway will automatically redeploy

## 🔄 Post-Deployment Checklist

- [ ] Backend is running on Railway
- [ ] Frontend is deployed on Netlify
- [ ] Database migrations are run (if using PostgreSQL)
- [ ] `VITE_API_BASE_URL` is set in Netlify to your Railway backend URL
- [ ] `ALLOWED_ORIGINS` in Railway includes your Netlify URL
- [ ] `SESSION_SECRET` is set in Railway
- [ ] Test login/signup functionality
- [ ] Test API endpoints from frontend

## 🔧 Troubleshooting

### Frontend can't connect to backend

1. Check `VITE_API_BASE_URL` in Netlify environment variables
2. Verify backend URL is accessible (try opening in browser)
3. Check browser console for CORS errors
4. Verify `ALLOWED_ORIGINS` includes your Netlify URL

### CORS Errors

1. Make sure `ALLOWED_ORIGINS` in Railway includes your exact Netlify URL
2. Check that `cors` package is installed: `npm install cors`
3. Verify backend is using the CORS middleware

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly in Railway
2. Check database is running in Railway dashboard
3. Ensure database migrations have been run

### Build Failures

**Netlify:**
- Check build logs in Netlify dashboard
- Verify Node version (should be 18+)
- Ensure all dependencies are in `package.json`

**Railway:**
- Check build logs in Railway dashboard
- Verify `build:backend` script works locally
- Check that all dependencies are installed

## 📝 Environment Variables Summary

### Railway (Backend)

```bash
SESSION_SECRET=your-secret-key
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=${{PORT}}
NODE_ENV=production
FRONTEND_HOSTED_SEPARATELY=true
ALLOWED_ORIGINS=https://your-app.netlify.app
```

### Netlify (Frontend)

```bash
VITE_API_BASE_URL=https://your-backend.up.railway.app
```

## 🔐 Security Notes

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use strong `SESSION_SECRET`** - Generate with `openssl rand -base64 32`
3. **Keep `ALLOWED_ORIGINS` specific** - Only include your actual frontend URL
4. **Use HTTPS** - Both Netlify and Railway provide HTTPS by default

## 🚀 Custom Domains

### Netlify Custom Domain

1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `ALLOWED_ORIGINS` in Railway to include your custom domain

### Railway Custom Domain

1. Go to your service → Settings → Networking
2. Add custom domain
3. Update `VITE_API_BASE_URL` in Netlify if you change the backend URL

## 📊 Monitoring

- **Railway**: Check logs in Railway dashboard
- **Netlify**: Check build logs and function logs (if using Netlify Functions)
- **Database**: Monitor in Railway dashboard → Database service

## 🔄 Continuous Deployment

Both platforms support automatic deployments:
- **Railway**: Automatically deploys on push to main branch
- **Netlify**: Automatically deploys on push to main branch (configure in site settings)

## 💡 Tips

1. **Test locally first**: Make sure `npm run build:frontend` and `npm run build:backend` work locally
2. **Use Railway's variable references**: `${{Postgres.DATABASE_URL}}` automatically updates if database changes
3. **Monitor costs**: Both platforms have free tiers, but monitor usage
4. **Set up alerts**: Configure email notifications for deployment failures

## 🆘 Need Help?

- Railway Docs: https://docs.railway.app
- Netlify Docs: https://docs.netlify.com
- Check build logs for specific error messages

