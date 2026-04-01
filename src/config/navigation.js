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
  LucideDatabase, Mailbox, LucideToolbox, LucideMenu, LucideCassetteTape, LucideGitBranch, LucideChartNoAxesGantt,
  LucideUserRoundPlus, LucideCalendar, LucideFile, LucideTag, UsersRoundIcon, LucideDoorOpen, LucideTags
} from "lucide-react";

export const navItems = [
  { title: "Home", icon: Home, href: "/" },
  {
    title: "Admin Menu",
    icon: LucideDatabase,
    href: "/admin",
    subItems: [
      { title: "Daily Menu", icon: LucideMenu, href: "/admin/daily-menu" },
      { title: "Monthly Menu", icon: LucideCalendar, href: "/reports/forms" },
      //{ title: "Banks", icon: Landmark, href: "/banks" },
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
    title: "Banks",
    icon: Landmark,
    href: "/banks",
    subItems: [
      // { title: "New Bank", icon: LucideFile, href: "/banks/new" },
      { title: "Bank Listing", icon: MapPinnedIcon, href: "/banks/listing" },
      { title: 'Tb Code/Lab Ind (Bank)', icon: Archive, href: '/archives', desc: 'Extract by Tb Code/Lab Ind (Bank)' },
      { title: 'Tb Code/Lab Ind (Mail)', icon: Archive, href: '/archives', desc: 'Extract by Tb Code/Lab Ind (Mail)' }
    ]
  },
  { 
    title: "Members", 
    icon: Users, 
    href: "/members",
    subItems: [
      { title: "Member Application", icon: UsersRoundIcon, href: "/members/apply" },
      { title: "Capture Member", icon: LucideUserRoundPlus, href: "/members/capture" },
      // { title: 'Members', icon: LucideDoorOpen, href: '/archives', desc: 'Extract Members that have resigned Society' },
      // { title: 'Members', icon: LucideFile, href: '/archives', desc: 'BPS Paid Up Members' },
      { title: 'Labels', icon: LucideTags, href: '/member/label', desc: 'Print Member Labels - Selection' }
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
