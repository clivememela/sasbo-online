import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

/**
 * ROUTE-LEVEL CODE SPLITTING -- R-PERF-A/C, `03.1`.
 *
 * Every page below was a STATIC import, so the first paint of /login downloaded the
 * member register, the capture form, the ACB debits screen and every archive page.
 * The bundle was 502 KiB before this phase, already past Vite's own warn threshold,
 * and it grew with every screen regardless of whether anyone visited it.
 *
 * The layouts stay STATIC and that is deliberate: they are on every route, so
 * splitting them would buy nothing and cost a waterfall -- the shell would have to
 * arrive before the page could even start loading.
 *
 * ⚠️ Splitting interacts with the route smoke test, and not in its favour. See
 * `RoutePending` for what had to change so the guard did not quietly weaken.
 *
 * The <Suspense> and the <ErrorBoundary> are NOT here. They sit beside the <Outlet> in
 * `Main` and `AuthLayout`, because a boundary wrapped around <Routes> would take the
 * header, the navigation and the footer down with the page it caught -- and A11's
 * standard is that the shell survives.
 */
const HomePage = lazy(() => import('./pages/Home'));
const BanksPage = lazy(() => import('./pages/bank_branch/BankBranch.jsx'));
const MembersPage = lazy(() => import('./pages/members/Members.jsx'));
const MembershipApplication = lazy(() => import('./pages/forms/MembershipApplication.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportOptions.jsx'));
const ArchivesPage = lazy(() => import('./pages/archives/ArchiveSearch.jsx'));
const AffiliationsOtherTradeUnions = lazy(() => import('./pages/archives/AffiliationsOtherTradeUnions.jsx'));
const FinanceHouses = lazy(() => import('./pages/archives/FinanceHouses.jsx'));
const ResearchInformation = lazy(() => import('./pages/archives/ResearchInformation.jsx'));
const AuthPage = lazy(() => import('./pages/auth/Auth.jsx'));
const Admin = lazy(() => import('./pages/admin/Admin.jsx'));
const Acb = lazy(() => import('./pages/admin/Acb.jsx'));
const AcbDebits = lazy(() => import('./pages/acb/AcbDebits.jsx'));
const DailyMenu = lazy(() => import('./pages/admin/DailyMenu.jsx'));
const MonthlyMenu = lazy(() => import('./pages/admin/MonthlyMenu.jsx'));
const CaptureMember = lazy(() => import('./pages/members/CaptureMember.jsx'));
const Maintenance = lazy(() => import('./pages/admin/Maintenance.jsx'));
const BankListing = lazy(() => import('./pages/bank_branch/BankListing.jsx'));
const RecruitmentChannel = lazy(() => import('./pages/maintainance/RecruitmentChannel.jsx'));
const Subscriptions = lazy(() => import('./pages/maintainance/Subscriptions.jsx'));

// NAMED exports, so the dynamic import has to be adapted to lazy()'s default-export
// contract. Written out rather than hidden in a helper: the shape of the mistake --
// `lazy(() => import(x))` on a module with no default -- fails at RUNTIME, on that
// route only, and this is the file where someone would copy the wrong line.
const OrganizerReport = lazy(() =>
  import('./pages/reports/OrganizerReport.jsx').then((m) => ({ default: m.OrganizerReport })));
const Forms = lazy(() =>
  import('./pages/forms/Forms.jsx').then((m) => ({ default: m.Forms })));
const Locations = lazy(() =>
  import('./pages/reports/Locations.jsx').then((m) => ({ default: m.Locations })));
const Recruiters = lazy(() =>
  import('./pages/members/Recruiters.jsx').then((m) => ({ default: m.Recruiters })));

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<AuthPage />} />
        <Route path="signup" element={<Navigate to="/login" replace />} />
      </Route>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="admin" element={<Admin />} />
        <Route path="admin/acb" element={<Acb />} />
        <Route path="admin/acb/debits" element={<AcbDebits />} />
        <Route path="admin/daily-menu" element={<DailyMenu />} />
        <Route path="admin/monthly-menu" element={<MonthlyMenu />} />
        <Route path="recruiters" element={<Recruiters />} />
        <Route path="banks" element={<BanksPage />} />
        <Route path="banks/listing" element={<BankListing />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/apply" element={<MembershipApplication />} />
        <Route path="members/capture" element={<CaptureMember />} />
        <Route path="members/recruiters" element={<Recruiters />} />
        <Route path="admin/maintenance/subscriptions" element={<Subscriptions />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/organizer-report" element={<OrganizerReport />} />
        <Route path="reports/forms" element={<Forms />} />
        <Route path="reports/locations" element={<Locations />} />
        <Route path="archives" element={<ArchivesPage />} />
        <Route path="archives/affiliations-other-trade-unions" element={<AffiliationsOtherTradeUnions />} />
        <Route path="archives/finance-houses" element={<FinanceHouses />} />
        <Route path="archives/research-information" element={<ResearchInformation />} />
        <Route path="admin/maintenance" element={<Maintenance/>} />
        <Route path="admin/maintenance/recruitment-channel" element={<RecruitmentChannel />} />
      </Route>
    </Routes>
  )
}

export default App
