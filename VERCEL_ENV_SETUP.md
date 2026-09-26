# Vercel Environment Variable Setup

## Problem
The frontend is timing out because it cannot reach the backend. This is because the Vercel deployment doesn't have the correct backend URL configured.

**Current state:**
- ✅ Backend deployed to Render: `https://sasbo-online-backend-latest.onrender.com`
- ❌ Frontend on Vercel doesn't know about it
- ❌ Frontend defaults to `localhost:8080` (which doesn't exist on Vercel)

**Result:** All API calls timeout (reference:banks, reference:bank branches, Members.loadMembers, etc.)

---

## Solution: Add Environment Variable to Vercel

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

### Step 5: Add New Environment Variable
Click the **Add New** button (top right)

![Step 5](./docs/vercel-step-5-add-new.png)

### Step 6: Fill in the Variable
Enter the following information:

**Name:**
```
VITE_API_BASE_URL
```

**Value:**
```
https://sasbo-online-backend-latest.onrender.com
```

**Environments:** Select all three:
- ✅ Production
- ✅ Preview  
- ✅ Development

![Step 6](./docs/vercel-step-6-fill-in.png)

### Step 7: Save
Click **Save**

![Step 7](./docs/vercel-step-7-save.png)

You should see it appear in the list:
```
VITE_API_BASE_URL (Production, Preview, Development)
https://sasbo-online-backend-latest.onrender.com
```

### Step 8: Redeploy
1. Go to **Deployments** tab (top menu)
2. Find the most recent deployment
3. Click the three dots (`...`) menu on the right
4. Click **Redeploy**

![Step 8](./docs/vercel-step-8-redeploy.png)

Vercel will redeploy with the new environment variable.

---

## Verification

### Expected Result
After redeployment completes (1-2 minutes):
- ✅ No more timeout errors in browser console
- ✅ Reference data loads (banks, bank branches)
- ✅ Members list loads
- ✅ ACB Runs section loads

### How to Verify
1. Open the Vercel frontend URL
2. Open DevTools → Console
3. Look for timeout errors

**Before fix:**
```
[sasbo] {context: 'reference:banks', kind: 'timeout', retryable: true}
[sasbo] {context: 'reference:bank branches', kind: 'timeout', retryable: true}
[sasbo] {context: 'Members.loadMembers', kind: 'timeout', retryable: true}
```

**After fix:**
```
(No timeout errors)
```

---

## If Redeployment Doesn't Work

### Clear Vercel Cache
1. Go to **Settings** → **Git**
2. Click **Clear Cache**
3. Redeploy again

### Verify Backend is Running
Test the backend directly:
```bash
curl https://sasbo-online-backend-latest.onrender.com/api/banks
```

Should return a list of banks (HTTP 200).

### Check Build Logs
1. Go to **Deployments**
2. Click on the failed/current deployment
3. Scroll down to see build logs for errors

---

## Environment Variables Reference

| Name | Value | Applied To |
|------|-------|-----------|
| `VITE_API_BASE_URL` | `https://sasbo-online-backend-latest.onrender.com` | Production, Preview, Development |
| `VITE_GOOGLE_API_KEY` | (already set) | Production, Preview, Development |

---

## Why This Matters

**Local development (.env file):**
- Your local `.env` file points to `http://localhost:8080`
- Works fine when running `npm run dev` locally

**Vercel deployment:**
- Vercel doesn't read `.env` files (security reason — they're in `.gitignore`)
- Vercel reads from Dashboard → Environment Variables
- Frontend code reads: `import.meta.env.VITE_API_BASE_URL`
- This gets the value from Vercel's environment, not from `.env`

**Without the environment variable set:**
- Vite has no value to use
- Falls back to default behavior
- Tries to reach `localhost:8080`
- Times out (no local backend)

**With the environment variable set:**
- Frontend correctly points to `https://sasbo-online-backend-latest.onrender.com`
- API calls succeed ✅

---

## Contact

If you encounter issues or need clarification, contact the backend team. The backend is running and responding correctly at `https://sasbo-online-backend-latest.onrender.com/api/banks`.
