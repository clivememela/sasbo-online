import {
  TextSelect,
  ArrowRightLeft,
  HandCoins,
  Home,
  Landmark,
  LucideInfo,
  Building2,
  Users,
  ChartNoAxesCombined,
  Archive,
  LogOutIcon,
  NotebookPen,
  Form,
  MapPinnedIcon,
  Plus,
  LucideDatabase, Mailbox, LucideToolbox, LucideMenu, LucideCassetteTape, LucideGitBranch, LucideChartNoAxesGantt,
  LucideUserRoundPlus, LucideCalendar, LucideFile, LucideTag
} from "lucide-react";

export const navItems = [
  { title: "Home", icon: Home, href: "/" },
  { title: "Banks", icon: Landmark, href: "/banks" },
  {
    title: "Admin Menu",
    icon: LucideDatabase,
    href: "/admin",
    subItems: [
      { title: "Daily Menu", icon: LucideMenu, href: "/miscellaneous/daily-menu" },
      { title: "Monthly Menu", icon: LucideCalendar, href: "/reports/forms" },
      { title: "Banks", icon: Landmark, href: "/banks" },
      { title: "Utilities", icon: LucideToolbox, href: "/reports/forms" },
      { title: "A.C.B", icon: LucideFile, href: "/reports/forms" },
      { title: "Regional Branches", icon: LucideGitBranch, href: "/reports/forms" },
      { title: "Tape", icon: LucideCassetteTape, href: "/reports/forms" },
      { title: "D.B.F", icon: LucideFile, href: "/banks/new" },
      { title: "Selective Print", icon: TextSelect, href: "/members/apply" },
      { title: "Committee", icon: LucideChartNoAxesGantt, href: "/members/apply"},
      { title: "Ad-Hoc Label", icon: LucideTag, href: "/members/apply"},
      { title: "Bank Transfer", icon: ArrowRightLeft, href: "/banks/new"},
      { title: "Letters for Return Debits", icon: Mailbox, href: "/members/apply"}
    ]
  },
  { 
    title: "Members", 
    icon: Users, 
    href: "/members",
    subItems: [
      { title: "Member Application", icon: LucideUserRoundPlus, href: "/members/apply" }
    ]
  },
  { 
    title: "Reports", 
    icon: ChartNoAxesCombined, 
    href: "/reports",
    subItems: [
      { title: "Organizer Report", icon: NotebookPen, href: "/reports/organizer-report" },
      { title: "Forms", icon: Form, href: "/reports/forms" },
      { title: "Location Listing", icon: MapPinnedIcon, href: "/reports/locations" }
    ]
  },
  {
    title:"Document Archives",
    icon: Archive,
    href: "/archives",
    subItems: [
      { title: "Affiliations/Other Trade Unions", icon: Building2, href: "/archives/affiliations-other-trade-unions" },
      { title: "Finance Houses", icon: HandCoins, href: "/archives/finance-houses" },
      { title: "Information & Research", icon: LucideInfo, href: "/archives/research-information" }
    ]}
];

export const authItems = [
  { title: "Logout", icon: LogOutIcon, href: "/login" },
];
