# AGENTS.md: SASBO Online Frontend

**Domain**: SASBO membership management system UI. React SPA serving member search, bank/branch lookup, administrative forms, reports, and archives.

## Architecture Overview

**Tech Stack**: React 19.2 | Vite | Tailwind CSS 4.1 | React Router 7 | Redux Toolkit | JavaScript

Single project repo serving as SPA on port 5173 (dev) or Render static site (prod).

## Project Structure

```
src/
├── pages/              # Route-level components mapped in App.jsx
├── components/         # Reusable UI components
│   ├── common/         # Shared (Logo, Breadcrumbs, PageTitle, ThemeToggle)
│   ├── form/           # Form controls (TextInput, SelectInput, Button, FilterForm)
│   ├── Footer.jsx
│   ├── Header.jsx
│   ├── Main.jsx
│   └── Sidebar.jsx
├── layouts/            # Page wrappers (AppLayout, AuthLayout)
├── services/           # API communication
│   └── api.js          # Base URL + request utility
├── hooks/              # Custom React hooks (shared logic)
├── context/            # React Context (ThemeContext for dark/light mode)
├── config/             # App configuration (routes, constants)
├── data/               # Static JSON fixtures (banks.json, members.json)
├── utils/              # Helper functions
└── assets/             # Images, styles, documents
    ├── styles/         # Global CSS
    ├── images/         # Logos, icons
    └── documents/      # PDFs
```

## Key Patterns & Conventions

### Routing & Layouts
- **App.jsx**: Defines all routes using React Router v7
- **Two layouts**:
  - **AuthLayout**: Wrapper for `/login`, `/signup` (no sidebar)
  - **AppLayout**: Wrapper for authenticated routes with sidebar + header + footer
- **Nested routes**: Parent route (`/`) renders `AppLayout`, child routes render page components

Example structure:
```jsx
<Route path="/" element={<AppLayout />}>
  <Route index element={<Navigate to="/login" />} />
  <Route path="home" element={<HomePage />} />
  <Route path="members" element={<MembersPage />} />
  <!-- nested routes inherit AppLayout -->
</Route>
```

### API Communication Pattern
- **File**: `src/services/api.js` exports `apiUrl(path)` utility
- **Environment-driven base URL**: 
  - Dev: `VITE_API_BASE_URL` from `.env` (defaults to empty, uses Vite proxy `/api` → `localhost:8080`)
  - Prod: `VITE_API_BASE_URL` set to Render backend URL
- **Usage**:
  ```javascript
  import { apiUrl } from './services/api.js';
  
  fetch(apiUrl('/api/members'))
    .then(res => res.json())
  ```

### Component Patterns

#### Form Components (`components/form/`)
- **TextInput, SelectInput**: Controlled inputs with onChange handlers
- **Button**: Reusable action button
- **FilterForm**: Compound component for search/filter UI
- **SearchableSelect**: Dropdown with search capability

#### Common Components (`components/common/`)
- **Logo**: SASBO branding
- **Breadcrumbs**: Navigation trail
- **PageTitle**: Heading with optional subtitle
- **SidebarItem**: Navigation link item
- **ThemeToggle**: Dark/light mode switcher

#### Layout Components
- **Header**: Top navigation bar
- **Sidebar**: Left navigation panel
- **Footer**: Bottom footer
- **Main**: Central content area
- **AppLayout**: Combines Header + Sidebar + Main + Footer
- **AuthLayout**: Auth-specific layout (login page only)

### Styling Convention
- **Tailwind CSS 4.1**: Utility-first CSS framework
- **Files**:
  - `src/assets/styles/index.css`: Global resets + Tailwind directives
  - `src/assets/styles/App.css`: Page-specific overrides (minimal)
- **Usage**: Inline Tailwind classes in JSX (e.g., `<div className="flex gap-4 p-8">`)

Note: The project also uses the `@tailwindcss/vite` plugin (configured in `vite.config.js`) to integrate Tailwind with Vite, and includes `shadcn-ui` as an additional component/ui helper in `package.json`. Agents should preserve the plugin when editing `vite.config.js` and can reference `shadcn-ui` for UI patterns where present.

### State Management
- **Redux Toolkit**: Centralized state (if complex state exists)
- **React Context**: `ThemeContext.jsx` manages dark/light mode globally
- **Custom Hooks**: `src/hooks/` folder for reusable stateful logic (e.g., `useTheme.js`)

### Icon Libraries
Multiple icon libraries available:
- **FontAwesome** (`@fortawesome/react-fontawesome`): Standard icons
- **Heroicons** (`@heroicons/react`): Clean, modern icons
- **Tabler Icons** (`@tabler/icons-react`): Data visualization icons
- **Lucide React** (`lucide-react`): Minimal line icons
- **React Icons** (`react-icons`): Fallback/utility icons

Choose icon library per component; prefer Heroicons for consistency.

## Build & Local Development

```bash
# Install dependencies
npm ci

# Start dev server (Vite, port 5173, HMR enabled)
npm run dev

# Production build (optimized, minified)
npm run build

# Local preview of production build
npm run preview

# Lint code (ESLint)
npm run lint
```

### Development Environment Setup
1. **Backend must run** on `localhost:8080` (required for API proxy)
2. **.env file** in project root:
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```
3. **Vite proxy** in `vite.config.js` forwards `/api/*` requests to backend

## Page Architecture

Each page component in `src/pages/`:
1. **Home**: Dashboard/landing page
2. **Banks** (`bank/BankSearch.jsx`): Search & list bank branches
3. **Members** (`members/Members.jsx`): Search & manage members
   - **CaptureMember**: Form to add new member
   - **Representatives**: Search representatives
4. **Forms** (`forms/`): 
   - **MembershipApplication**: PDF form for new membership
   - **Forms**: Generic forms page
5. **Reports** (`reports/`):
   - **ReportOptions**: Report menu
   - **OrganizerReport**: Generate organizer reports
   - **Locations**: Geographic reports
6. **Archives** (`archives/`):
   - **ArchiveSearch**: Historical data search
   - **AffiliationsOtherTradeUnions**: Archive section
   - **FinanceHouses**: Finance data archives
   - **ResearchInformation**: Research archives
7. **Admin** (`admin/`):
   - **Admin**: Dashboard
   - **DailyMenu**: Daily operations menu
   - **MonthlyMenu**: Monthly operations menu
   - **Maintenance**: System maintenance page
8. **Auth** (`auth/Auth.jsx`): Login/signup page

## Critical Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies & npm scripts |
| `vite.config.js` | Vite build config + API proxy |
| `.env` | Local development env vars (VITE_API_BASE_URL) |
| `vite.config.js` | Frontend build & dev server config |
| `eslint.config.js` | Linting rules |
| `render.yaml` | Render.com deployment config (static site) |

## Deployment Pipeline

### Render Static Site Deployment
```yaml
# render.yaml
build command: npm ci && npm run build
publish directory: dist
environment:
  - VITE_API_BASE_URL: https://sasbo-online-backend.onrender.com
```

- **Build**: `npm ci && npm run build` → outputs to `dist/`
- **Publish**: Render serves static files from `dist/`
- **API**: Frontend connects to backend via `VITE_API_BASE_URL` env var

## Common Workflows

### Adding a New Page
1. Create component in `src/pages/section/PageName.jsx`
2. Add route in `App.jsx`:
   ```jsx
   <Route path="new-page" element={<NewPage />} />
   ```
3. Add navigation link in sidebar config or `Sidebar.jsx`
4. Use `useNavigate()` from React Router for programmatic navigation

### Adding a New Form Component
1. Create in `src/components/form/FormComponentName.jsx`
2. Accept props for `value`, `onChange`, `placeholder`, etc.
3. Export from `src/components/form/index.js` for convenience imports
4. Use Tailwind classes for styling

### Fetching Data from Backend
```javascript
import { apiUrl } from '../services/api';

// In useEffect:
useEffect(() => {
  fetch(apiUrl('/api/members'))
    .then(res => res.json())
    .then(data => setMembers(data))
    .catch(err => console.error(err));
}, []);
```

### Theme Toggle
- **File**: `src/context/ThemeContext.jsx`
 - **Hook**: `useTheme()` provides the theme state and mutators used in this project. Current implementation exposes `darkMode`, `toggleDarkMode`, and `setDarkMode` (see `src/context/ThemeContext.jsx`). Example usage:
  ```jsx
  const { darkMode, toggleDarkMode } = useTheme();
  // darkMode is boolean; toggleDarkMode() flips it; setDarkMode(value) is also available
  ```
 - **Tailwind dark mode**: Add `dark:` prefix for dark mode styles

## Known Patterns to Replicate

✅ **Nested Routes with Layouts**: Use React Router outlet for nested pages
✅ **API Base URL**: Always use `apiUrl()` helper for cross-environment compatibility
✅ **Environment Variables**: Prefix with `VITE_` for Vite to expose them
✅ **Tailwind for Styling**: Prefer utility classes; avoid inline CSS
✅ **Reusable Form Components**: Build generic TextInput, SelectInput, Button
✅ **React Context for Global State**: Theme, auth state (minimal Redux if complex)
✅ **Page-level Components**: Colocate related components in `src/pages/section/`

## PDF Integration

- **inspect_pdf.js**: Utility script for PDF inspection (development tool)
- **pdf-lib**: Library for PDF manipulation
- **Document assets**: `src/assets/documents/` (e.g., Membership Application.pdf)

---
*Last updated: June 2026*

