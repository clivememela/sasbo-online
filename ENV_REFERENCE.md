# Environment Variables Reference

This document explains all environment files and their purpose across Development, Preprod, and Production environments.

---

## Frontend Environment Files

Located in: `/Users/clivememela/WebstormProjects/sasbo-online/`

### `.env.local`
- **Purpose:** Local development on your machine
- **Backend:** `http://localhost:8080`
- **Usage:** `npm run dev` (uses this automatically)
- **Debug:** Enabled (VITE_DEBUG=true)

### `.env.development`
- **Purpose:** Development environment (Vercel Development)
- **Backend:** `http://localhost:8080`
- **Usage:** Development builds
- **Debug:** Enabled (VITE_DEBUG=true)

### `.env.preprod`
- **Purpose:** Preprod/Preview environment (Vercel Preview)
- **Backend:** `https://sasbo-online-backend-preprod.onrender.com`
- **Usage:** Feature branch deployments
- **Debug:** Disabled (VITE_DEBUG=false)

### `.env.production`
- **Purpose:** Production environment (Vercel Production)
- **Backend:** `https://sasbo-online-backend-prod.onrender.com`
- **Usage:** Main branch deployments
- **Debug:** Disabled (VITE_DEBUG=false)

### Environment Variables in Files

| Variable | Description | Values |
|----------|-------------|--------|
| `VITE_API_BASE_URL` | Backend API endpoint | URL based on environment |
| `VITE_GOOGLE_API_KEY` | Google Maps/API key | Your API key (keep secret) |
| `VITE_DEBUG` | Debug mode | `true` (dev) or `false` (prod) |

---

## Backend Environment Files

Located in: Backend repository root `/IdeaProjects/sasbo-online-backend/`

### `.env.local`
- **Purpose:** Local development (running backend locally)
- **Service:** Local Java application on port 8080
- **Database:** Local PostgreSQL
- **Logging:** DEBUG (verbose)
- **Schema:** `create-drop` (fresh DB each startup)

### `.env.development`
- **Purpose:** Dev Render service deployment
- **Service:** `sasbo-online-backend-dev` on Render
- **Database:** Dev PostgreSQL instance
- **Logging:** DEBUG
- **Schema:** `validate` (checks schema exists)

### `.env.preprod`
- **Purpose:** Preprod Render service deployment
- **Service:** `sasbo-online-backend-preprod` on Render
- **Database:** Preprod PostgreSQL instance
- **Logging:** INFO (standard)
- **Schema:** `validate` (checks schema exists)

### `.env.production`
- **Purpose:** Production Render service deployment
- **Service:** `sasbo-online-backend-prod` on Render
- **Database:** Production PostgreSQL instance
- **Logging:** WARN (minimal, only warnings/errors)
- **Schema:** `validate` (strict, checks schema exists)

### Environment Variables in Files

| Variable | Description | Examples |
|----------|-------------|----------|
| `SPRING_DATASOURCE_URL` | Database connection | `jdbc:postgresql://host:5432/dbname` |
| `SPRING_DATASOURCE_USERNAME` | Database user | `sasbo_user` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `password_123` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `development`, `preprod`, `production` |
| `SERVER_PORT` | Application port | `8080` |
| `LOGGING_LEVEL_ROOT` | Logging level | `DEBUG`, `INFO`, `WARN` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend URLs | Frontend URLs per environment |
| `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` | DB connection pool | Dev: 10, Preprod: 20, Prod: 30 |

---

## Environment Mapping

### Development Environment
```
Frontend: npm run dev (localhost:5173)
  ↓ connects to
Backend: http://localhost:8080
  ↓ connects to
Database: Local PostgreSQL
```

### Preprod Environment
```
Frontend: Vercel Preview (feature branch)
  ↓ connects to
Backend: sasbo-online-backend-preprod.onrender.com
  ↓ connects to
Database: Preprod PostgreSQL on Render
```

### Production Environment
```
Frontend: Vercel Production (main branch)
  ↓ connects to
Backend: sasbo-online-backend-prod.onrender.com
  ↓ connects to
Database: Production PostgreSQL on Render
```

---

## Security Notes

⚠️ **Important:**

1. **Never commit `.env.local` to git** - it's in `.gitignore` for a reason
2. **Production passwords must be strong** - use generated, unique passwords
3. **Database credentials** - rotate regularly
4. **API Keys** - keep Google API keys secure, rotate regularly
5. **Render dashboard** - environment variables stored securely there
6. **Vercel dashboard** - environment variables stored securely there

### Local Development
- Use placeholder/test values in `.env.local`
- Never use production credentials locally
- Never commit real credentials

### Render/Vercel
- Set environment variables in dashboard (not in git)
- Use strong passwords
- Restrict access to dashboards

---

## How to Use

### Local Development

**Backend:**
```bash
cd sasbo-online-backend

# Uses .env.local automatically
./gradlew bootRun
```

**Frontend:**
```bash
cd sasbo-online

# Uses .env.local automatically
npm run dev
```

### Render Deployments

Environment variables are set in Render dashboard (not in git files):

1. Go to **Render Dashboard**
2. Select service (dev, preprod, or prod)
3. Click **Environment**
4. Add variables from `.env.development`, `.env.preprod`, or `.env.production`

### Vercel Deployments

Environment variables are set in Vercel dashboard (not in git files):

1. Go to **Vercel Dashboard**
2. Select `sasbo-online` project
3. **Settings → Environment Variables**
4. Add variables from `.env.development`, `.env.preprod`, or `.env.production`

---

## File Locations Summary

### Frontend
```
/Users/clivememela/WebstormProjects/sasbo-online/
├── .env.local              ← Local dev
├── .env.development        ← Dev environment
├── .env.preprod            ← Preprod environment
└── .env.production         ← Production environment
```

### Backend
```
/Users/clivememela/IdeaProjects/sasbo-online-backend/
├── .env.local              ← Local dev
├── .env.development        ← Dev environment
├── .env.preprod            ← Preprod environment
└── .env.production         ← Production environment
```

---

## Next Steps

1. **Update `.env.local` files** with your actual local database credentials
2. **Add environment variables to Render dashboard** (see RENDER_ENV_SETUP.md)
3. **Add environment variables to Vercel dashboard** (see VERCEL_ENV_SETUP.md)
4. **Verify connectivity:**
   ```bash
   # Local backend test
   curl http://localhost:8080/api/banks
   
   # Preprod backend test
   curl https://sasbo-online-backend-preprod.onrender.com/api/banks
   
   # Production backend test
   curl https://sasbo-online-backend-prod.onrender.com/api/banks
   ```

---

## Troubleshooting

### Backend won't start
- Check `.env.local` database credentials
- Verify PostgreSQL is running: `psql -U [user] -d [database]`
- Check logs for connection errors

### Frontend timeout errors
- Verify `VITE_API_BASE_URL` is correct
- Check backend is running: `curl [backend-url]/api/banks`
- Check browser console for CORS errors

### Wrong environment values
- Make sure you're using correct `.env.*` file
- For Render/Vercel: check dashboard environment variables
- Clear browser cache and restart dev server

---

## Questions?

- **Backend issues:** Check backend logs and `.env.local` configuration
- **Frontend issues:** Check browser console and `VITE_API_BASE_URL`
- **Deployment issues:** Check Render or Vercel dashboard
- **Database issues:** Contact database administrator
