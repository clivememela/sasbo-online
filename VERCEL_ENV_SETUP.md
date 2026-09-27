# Vercel Environment Variable Setup (Frontend)

## Problem
The frontend is timing out because it cannot reach the backend. This is because the Vercel deployment doesn't have the correct backend URL configured for each environment.

**Current state:**
- ✅ Backend deployed to Render (multiple environments)
- ❌ Frontend on Vercel doesn't know about it
- ❌ Frontend defaults to `localhost:8080` (which doesn't exist on Vercel)

**Result:** All API calls timeout (reference:banks, reference:bank branches, Members.loadMembers, etc.)

---

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
Open **https://vercel.com/dashboard** and log in

### Step 2: Select the `sasbo-online` Project
Click on the **sasbo-online** project from your projects list

### Step 3: Go to Settings
In the top menu, click **Settings**

![Step 3](./docs/vercel-step-3-settings.png)

### Step 4: Navigate to Environment Variables
In the left sidebar, click **Environment Variables**

![Step 4](./docs/vercel-step-4-env-vars.png)

### Step 5: Add Environment Variables

You need to add **2 variables × 3 environments = 6 total entries** in Vercel.

---

## Environment Variables by Environment

### DEVELOPMENT
Used when running locally with `npm run dev`

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `http://localhost:8080` |
| `VITE_GOOGLE_API_KEY` | (your key) |

**Steps:**
1. Click **Add New**
2. Name: `VITE_API_BASE_URL`
3. Value: `http://localhost:8080`
4. Environments: **Development** only
5. Click **Save**

Then add `VITE_GOOGLE_API_KEY`:
1. Click **Add New**
2. Name: `VITE_GOOGLE_API_KEY`
3. Value: (your Google API key)
4. Environments: **Development** only
5. Click **Save**

---

### PREPROD / PREVIEW
Used for preview deployments on Vercel (feature branches, PRs, staging environment)

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://sasbo-online-backend-preprod.onrender.com` |
| `VITE_GOOGLE_API_KEY` | (your key) |

**Steps:**
1. Click **Add New**
2. Name: `VITE_API_BASE_URL`
3. Value: `https://sasbo-online-backend-preprod.onrender.com`
4. Environments: **Preview** only
5. Click **Save**

Then add `VITE_GOOGLE_API_KEY`:
1. Click **Add New**
2. Name: `VITE_GOOGLE_API_KEY`
3. Value: (your Google API key)
4. Environments: **Preview** only
5. Click **Save**

---

### PRODUCTION
Used for the live production deployment

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://sasbo-online-backend-prod.onrender.com` |
| `VITE_GOOGLE_API_KEY` | (your key) |

**Steps:**
1. Click **Add New**
2. Name: `VITE_API_BASE_URL`
3. Value: `https://sasbo-online-backend-prod.onrender.com`
4. Environments: **Production** only
5. Click **Save**

Then add `VITE_GOOGLE_API_KEY`:
1. Click **Add New**
2. Name: `VITE_GOOGLE_API_KEY`
3. Value: (your Google API key)
4. Environments: **Production** only
5. Click **Save**

---

## Quick Reference Table

| Variable | Development | Preprod/Preview | Production |
|----------|-------------|-----------------|------------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | `https://sasbo-online-backend-preprod.onrender.com` | `https://sasbo-online-backend-prod.onrender.com` |
| `VITE_GOOGLE_API_KEY` | (your key) | (your key) | (your key) |

---

## Step-by-Step in Vercel Dashboard

### For Each Variable:

1. Go to **Settings → Environment Variables**
2. Click **Add New**
3. Enter **Name** (e.g., `VITE_API_BASE_URL`)
4. Enter **Value** (from table above)
5. Select **Environments** (Development, Preview, or Production)
6. Click **Save**

![Example](./docs/vercel-add-env-var.png)

### Full List to Add:

```
# Development Environment
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_API_KEY=[your-key]

# Preprod/Preview Environment
VITE_API_BASE_URL=https://sasbo-online-backend-preprod.onrender.com
VITE_GOOGLE_API_KEY=[your-key]

# Production Environment
VITE_API_BASE_URL=https://sasbo-online-backend-prod.onrender.com
VITE_GOOGLE_API_KEY=[your-key]
```

---

## After Adding All Variables

### Redeploy Each Environment

1. Go to **Deployments** tab
2. For each environment (development, preprod/preview, production):
   - Find the latest deployment
   - Click three dots (`...`)
   - Click **Redeploy**

---

## Verification

### Expected Result
After redeployment completes:
- ✅ No more timeout errors in browser console
- ✅ Reference data loads (banks, bank branches)
- ✅ Members list loads
- ✅ ACB Runs section loads

### How to Verify by Environment

**Development (Local):**
```bash
npm run dev
# Open http://localhost:5173
# Check console - no timeout errors
# Should connect to localhost:8080 backend
```

**Preprod/Preview (Vercel Feature Branch):**
```bash
# Push to a feature branch
git push origin feature-branch

# Vercel auto-deploys to preview URL
# Open the preview URL from Vercel
# Check console - no timeout errors
# Should connect to preprod backend
```

**Production (Vercel Main Branch):**
```bash
# Push to main
git push origin main

# Vercel auto-deploys to production URL
# Check console - no timeout errors
# Should connect to production backend
```

---

## If Redeployment Doesn't Work

### Clear Vercel Cache
1. Go to **Settings** → **Git**
2. Click **Clear Cache**
3. Redeploy again

### Verify Backend URLs are Running
Test each backend:
```bash
# Preprod backend
curl https://sasbo-online-backend-preprod.onrender.com/api/banks

# Production backend
curl https://sasbo-online-backend-prod.onrender.com/api/banks
```

Both should return HTTP 200 with bank list.

### Check Build Logs
1. Go to **Deployments**
2. Click on the deployment
3. Scroll down to see build logs for errors

---

## Why Multiple Environments?

| Environment | Use Case | Branch | Backend | Audience |
|------------|----------|--------|---------|----------|
| **Development** | Local machine | N/A | Localhost | Developer |
| **Preprod/Preview** | Feature branches, testing | Feature branches | Preprod backend | QA, Testing |
| **Production** | Live users | main branch | Production backend | End users |

Different environments connect to different backends which may have different data, performance tuning, or features.

---

## Environment Configuration Files

Local configuration files (not committed to Vercel):

**`.env` (Development)**
```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_API_KEY=[your-key]
```

**`.env.development`**
```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_API_KEY=[your-key]
```

**`.env.production`**
```
VITE_API_BASE_URL=https://sasbo-online-backend-prod.onrender.com
VITE_GOOGLE_API_KEY=[your-key]
```

---

## Contact

If you encounter issues or need clarification, contact the backend team. All backends (preprod and production) should be running and responding correctly.
