import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/Home';
import BanksPage from './pages/bank/BankSearch.jsx';
import MembersPage from './pages/members/Members.jsx';
import MembershipApplication from './pages/forms/MembershipApplication.jsx';
import ReportsPage from './pages/ReportOptions.jsx';
import { OrganizerReport } from './pages/reports/OrganizerReport.jsx';
import { Forms } from './pages/forms/Forms.jsx';
import { Locations } from './pages/reports/Locations.jsx';
import ArchivesPage from './pages/archives/ArchiveSearch.jsx';
import AffiliationsOtherTradeUnions from './pages/archives/AffiliationsOtherTradeUnions.jsx';
import FinanceHouses from './pages/archives/FinanceHouses.jsx';
import ResearchInformation from './pages/archives/ResearchInformation.jsx';
import AuthPage from './pages/auth/Auth.jsx';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import Admin from "./pages/admin/Admin.jsx";
import DailyMenu from "./pages/admin/DailyMenu.jsx";
import MonthlyMenu from "./pages/admin/MonthlyMenu.jsx";
import Representatives from "./pages/members/Representatives.jsx";
import CaptureMember from "./pages/members/CaptureMember.jsx";
import Maintenance from "./pages/admin/Maintenance.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<AuthPage />} />
        <Route path="signup" element={<Navigate to="/login" replace />} />
      </Route>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="admin" element={<Admin />} />
        <Route path="admin/daily-menu" element={<DailyMenu />} />
        <Route path="admin/monthly-menu" element={<MonthlyMenu />} />
        <Route path="representatives" element={<Representatives />} />
        <Route path="banks" element={<BanksPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/apply" element={<MembershipApplication />} />
        <Route path="members/capture" element={<CaptureMember />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/organizer-report" element={<OrganizerReport />} />
        <Route path="reports/forms" element={<Forms />} />
        <Route path="reports/locations" element={<Locations />} />
        <Route path="archives" element={<ArchivesPage />} />
        <Route path="archives/affiliations-other-trade-unions" element={<AffiliationsOtherTradeUnions />} />
        <Route path="archives/finance-houses" element={<FinanceHouses />} />
        <Route path="archives/research-information" element={<ResearchInformation />} />
        <Route path="maintenance" element={<Maintenance/>} />
      </Route>
    </Routes>
  )
}

export default App
