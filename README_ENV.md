# Environment Variables Guide

## 📁 How Many .env Files Do You Need?

**Answer: ONE `.env` file at the project root** (same level as `package.json`)

This is a **monorepo** structure where:
- **Backend** (`server/`) reads from `process.env` (Node.js environment)
- **Frontend** (`client/`) reads from `import.meta.env` (Vite environment)

Both can share the same `.env` file at the root because:
1. **Backend variables** (no prefix) are read by Node.js via `dotenv`
2. **Frontend variables** (must have `VITE_` prefix) are exposed by Vite automatically

## 🔐 Environment Variables Model

### Required Variables

```bash
SESSION_SECRET=your-super-secret-jwt-key-here
```

### Optional Variables

```bash
# Server port (defaults to 5000)
PORT=5000

# MongoDB connection string (if you want to use MongoDB)
MONGODB_URI=mongodb://localhost:27017/finance-manager
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Frontend API base URL (only if frontend hosted separately)
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 📝 Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and fill in your values:**
   - Set `SESSION_SECRET` to a strong random string
   - Set `MONGODB_URI` to your MongoDB connection string
   - Optionally set `PORT` if you want a different port
   - Optionally set `VITE_API_BASE_URL` if frontend is separate

3. **Generate a secure SESSION_SECRET:**
   ```bash
   # Using OpenSSL
   openssl rand -base64 32
   
   # Or using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## 🚀 How to Run the Project

### Development Mode

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

This will:
- Start the Express backend server
- Start the Vite dev server for the frontend
- Both run on port 5000 (or your `PORT` env variable)
- Access the app at: `http://localhost:5000`

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## ⚠️ Important Notes

1. **MongoDB Connection**: The current codebase uses **in-memory storage**. If you want to use MongoDB, you'll need to:
   - Install `mongoose` package: `npm install mongoose`
   - Implement MongoDB storage layer (replace `server/storage.ts`)
   - The `MONGODB_URI` variable is ready for when you implement this

2. **Frontend Variables**: Only variables prefixed with `VITE_` are exposed to the frontend code. This is a Vite security feature.

3. **Never commit `.env`**: Make sure `.env` is in your `.gitignore` (it should be already).

4. **Environment-Specific Files**: You can create:
   - `.env.development` - for development
   - `.env.production` - for production
   - `.env.local` - for local overrides (highest priority)

## 🔍 Current Project Status

- ✅ Environment variable loading configured
- ✅ JWT authentication uses `SESSION_SECRET`
- ✅ Frontend API base URL configurable via `VITE_API_BASE_URL`
- ⚠️ MongoDB connection not yet implemented (uses in-memory storage)
- ⚠️ Database persistence will be lost on server restart until MongoDB is implemented

