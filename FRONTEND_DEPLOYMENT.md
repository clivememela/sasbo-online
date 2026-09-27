# Frontend Deployment & Environment Setup

## Overview

This directory contains deployment and configuration guides for the SASBO Online Frontend across three environments:
- **Development** - Local testing (localhost)
- **Preprod/Preview** - Staging environment on Vercel
- **Production** - Live production environment on Vercel

---

## Quick Links

- **[Vercel Environment Setup](./VERCEL_ENV_SETUP.md)** - Configure environment variables in Vercel dashboard for all 3 environments
- **[Vite Configuration](./vite.config.js)** - Build and dev server configuration
- **[Frontend README](./README.md)** - Project overview and local development
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification steps

---

## Deployment Platforms

### Development (Local)
- **URL:** `http://localhost:5173` (dev server)
- **Backend:** `http://localhost:8080` (local backend)
- **Logging:** DEBUG level
- **Building:** `npm run dev`
- **Access:** Your local machine

### Preprod/Preview (Vercel)
- **URL:** `https://[project]-[hash]-preprod.vercel.app`
- **Backend:** `https://sasbo-online-backend-preprod.onrender.com`
- **Logging:** INFO level
- **Building:** Automatic on feature branch push
- **Access:** QA, testing, stakeholders

### Production (Vercel)
- **URL:** `https://sasbo.online` (or your custom domain)
- **Backend:** `https://sasbo-online-backend-prod.onrender.com`
- **Logging:** WARN level
- **Building:** Automatic on main branch push
- **Access:** End users

---

## Getting Started

### 1. Local Development Setup
```bash
# Clone the repository
git clone https://github.com/your-org/sasbo-online.git
cd sasbo-online

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173
```

### 2. Configure Environment Variables
Follow [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) to add environment variables to Vercel.

### 3. Build for Production
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Environment Variables

Each environment requires specific configuration. See [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) for complete setup.

### Local Development (`.env`)
```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_API_KEY=[your-google-key]
```

### Preprod (Vercel Preview)
```
VITE_API_BASE_URL=https://sasbo-online-backend-preprod.onrender.com
VITE_GOOGLE_API_KEY=[your-google-key]
```

### Production (Vercel)
```
VITE_API_BASE_URL=https://sasbo-online-backend-prod.onrender.com
VITE_GOOGLE_API_KEY=[your-google-key]
```

---

## Deployment Workflow

### Development Workflow (Local)
```bash
git checkout develop
npm install
npm run dev
# Test features locally at http://localhost:5173
```

### Preprod/Preview Workflow (Feature Branch)
```bash
git checkout -b feature/my-feature
# Make changes
npm run lint      # Check code quality
npm run test      # Run tests
npm run build     # Verify production build works

git push origin feature/my-feature
# Vercel auto-deploys to preview URL
# QA tests the feature
# If approved, create PR to main
```

### Production Workflow (Main Branch)
```bash
git checkout main
git pull origin main
# Vercel auto-deploys to production
# Live for end users
```

---

## CI/CD Pipeline

### Automated on Every Push

1. **Lint Check** - `npm run lint` validates code style
2. **Tests Run** - `npm run test` runs unit tests
3. **Build** - `npm run build` creates production bundle
4. **Deploy** - Vercel deploys to preview or production

### Manual Verification

Before pushing to main (production):
```bash
npm run lint      # Check code quality
npm run test      # Run unit tests
npm run build     # Verify production build succeeds
npm run preview   # Test production build locally
```

---

## Building & Optimization

### Development Build
```bash
npm run dev
# Fast, with source maps for debugging
# Not optimized for production
```

### Production Build
```bash
npm run build
# Minified, optimized JavaScript
# Tree-shaking removes unused code
# Output in `dist/` directory
```

### Build Configuration

See `vite.config.js`:
```javascript
build: {
  sourcemap: false,      // No source maps in production
  minify: 'esbuild',     // Fast minification
}
```

---

## Testing

### Unit Tests
```bash
npm run test
# Runs Vitest in watch mode
```

### Coverage Reports
```bash
npm run test:coverage
# Generates coverage report
# View at `coverage/index.html`
```

### Test Performance Expectations
```bash
npm run test
# Full suite: ~40-60 seconds
# Parallel workers: 4 (configurable)
```

---

## Monitoring & Debugging

### Browser DevTools
```javascript
// Check API base URL
console.log(import.meta.env.VITE_API_BASE_URL)

// Check if backend is reachable
fetch(import.meta.env.VITE_API_BASE_URL + '/api/banks')
  .then(r => r.json())
  .then(console.log)
```

### Network Tab
1. Open DevTools → Network tab
2. Reload page
3. Check API requests:
   - ✅ Correct URL (not localhost on production)
   - ✅ Status 200 (not timeout)
   - ✅ Response data (not HTML error)

### Common Issues

| Issue | Check | Solution |
|-------|-------|----------|
| API timeout | Console, Network tab | Verify `VITE_API_BASE_URL` set in Vercel |
| CORS error | Network → Headers | Verify backend CORS allows frontend origin |
| 404 Not Found | Network → Response | Verify API endpoint exists |
| Blank page | Console, Network | Check build output in Vercel logs |

---

## Performance

### Bundle Analysis
```bash
# Check bundle size
npm run build
# Vercel shows size in deployment log
```

### Lighthouse Audit
```bash
# Run locally
npm run build
npm run preview
# Open DevTools → Lighthouse tab
```

### Optimization Tips
- Code splitting (automatic with Vite)
- Image optimization (Vite handles automatically)
- CSS minification (automatic in production)
- Dead code elimination (tree-shaking)

---

## Rollback

If deployment goes wrong:

### Option 1: Automatic Rollback
```bash
git revert [commit-hash]
git push origin main
# Vercel auto-deploys previous version
```

### Option 2: Manual Rollback in Vercel
1. Go to **Vercel Dashboard → sasbo-online → Deployments**
2. Find previous working deployment
3. Click three dots (`...`)
4. Click **Promote to Production**

---

## Environment-Specific Configuration

### Using Environment Variables in Code
```javascript
// Safe to use in frontend code (public)
const API_BASE = import.meta.env.VITE_API_BASE_URL

// Never put secrets in VITE_* variables
// They're bundled in the JavaScript
```

### Local Testing Different Environments
```bash
# Test with dev backend
VITE_API_BASE_URL=http://localhost:8080 npm run dev

# Test with preprod backend
VITE_API_BASE_URL=https://sasbo-online-backend-preprod.onrender.com npm run dev

# Test with production backend (careful!)
VITE_API_BASE_URL=https://sasbo-online-backend-prod.onrender.com npm run build
```

---

## Troubleshooting

### Build Failures

**Memory Issues:**
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**Missing Dependencies:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Runtime Issues

**Timeouts on API calls:**
- Check `VITE_API_BASE_URL` in Vercel environment
- Verify backend is running: `curl [backend-url]/api/banks`
- Check network latency: DevTools → Network tab

**CORS errors:**
- Verify Vercel frontend URL is in backend CORS configuration
- Check browser console for full error details

**Blank screen:**
- Check browser console for errors
- Check Vercel build logs
- Try clearing browser cache

---

## Support

- **Local Dev Issues:** Check `npm run dev` output
- **Build Issues:** Check Vercel build logs
- **Runtime Issues:** Check browser console and Network tab
- **API Issues:** Contact backend team
- **Deployment Issues:** Check Vercel dashboard
- **Team Help:** Contact frontend team lead

---

## Security Checklist

✅ No secrets in code (only in Vercel environment variables)  
✅ `VITE_API_BASE_URL` correctly points to backend per environment  
✅ CORS properly configured on backend  
✅ Authentication tokens handled securely  
✅ Sensitive data not logged in production  
✅ Dependencies up-to-date and secure  
✅ Build optimized (no source maps in production)  

---

## Related Documentation

- [Backend Setup Guide](../sasbo-online-backend/BACKEND_DEPLOYMENT.md)
- [Vercel Environment Setup](./VERCEL_ENV_SETUP.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Component Documentation](./COMPONENTS.md)
- [API Integration Guide](./API_INTEGRATION.md)
