# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploy with Render (Database + Backend + Frontend)

1. **Create PostgreSQL database on Render**
   - In Render dashboard: `New +` → `PostgreSQL`.
   - Save the internal connection string from Render (use this as `spring.datasource.url` in backend).

2. **Deploy backend web service (`sasbo-online-backend`)**
   - Create a new `Web Service` from backend repository.
   - Runtime: `Java`
   - Build command: `./gradlew build`
   - Start command: `./gradlew bootRun`
   - Environment variables (minimum):
     - `SPRING_DATASOURCE_URL` = Render PostgreSQL internal URL
     - `DB_USERNAME` = Render PostgreSQL user
     - `DB_PASSWORD` = Render PostgreSQL password
     - `SERVER_PORT` = `10000`
   - Ensure backend accepts frontend origin via CORS (set your Render frontend URL in backend CORS config).

3. **Deploy frontend static site (`sasbo-online`)**
   - This repo includes `render.yaml` for static deployment.
   - Create a new `Static Site` from this repository.
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
   - Environment variable:
     - `VITE_API_BASE_URL` = your backend Render URL (for example `https://sasbo-online-backend.onrender.com`)

4. **Post-deployment checks**
   - Open frontend URL and verify member/bank/branch API calls succeed.
   - Test creating a member from UI and confirm record persists in Render PostgreSQL.
