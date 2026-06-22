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
  LucideUserRoundPlus, LucideCalendar, LucideFile, LucideTag, UsersRoundIcon, LucideDoorOpen, LucideTags,
  LucideUserCheck2, LucidePenBox, LucidePiggyBank, LucidePresentation, LucideTable, LucideLocate, LucideCopyCheck,
  LucidePrinter, LucideSettings, LucideSettings2, LucideConstruction, LucideHdmiPort, LucideLogs, LucideMail,
  LucideTrain, LucidePaintRoller, LucideUserRound
} from "lucide-react";

export const navItems = [
  {
    title: "Home",
    icon: Home,
    href: "/home" },
  {
    title: "Admin Menu",
    icon: LucideDatabase,
    href: "/admin",
    subItems: [
      {
        title: "Daily Menu",
        icon: LucideMenu,
        href: "/admin/daily-menu",
        subItems: [
          {
            title: "Members",
            icon: Users,
            href: "/members",
            subItems: [
              // { title: "Member Application", icon: UsersRoundIcon, href: "/members/apply" },
              { title: "Capture Member", icon: LucideUserRoundPlus, href: "/members/capture" },
              // { title: 'Members', icon: LucideDoorOpen, href: '/archives', desc: 'Extract Members that have resigned Society' },
              // { title: 'Members', icon: LucideFile, href: '/archives', desc: 'BPS Paid Up Members' },
              //{ title: 'Labels', icon: LucideTags, href: '/member/label', desc: 'Print Member Labels - Selection' }
            ]
          },
          // {
          //   title: 'Print Members Audit Trail',
          //   icon: LucideUserCheck2,
          //   desc: 'Member Detail Enquiry',
          //   color: 'text-red-600 dark:text-red-400'
          // },
          {
            title: 'Death Benefit/Bene. Fund',
            icon: LucidePenBox,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Endowment Fund',
            icon: LucidePiggyBank,
            //href: '/endowment-fund',
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Representatives',
            icon: LucidePresentation,
            href: '/representatives',
            desc: 'Capture/Print Representatives'
          },
          {
            title: 'Suspension/Rejection Table',
            icon: LucideTable,
            desc: 'Suspension/Rejection Table',
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Recruiter Table Maintenance',
            icon: LucideTable,
            desc: 'Recruiter Table Maintenance',
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Area Table Maintenance',
            icon: LucideLocate,
            href: '/area',
            desc: 'Area Table Maintenance',
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Duplicate Employee Numbers',
            icon: LucideCopyCheck,
            href: '/archives',
            desc: 'Print Duplicate Employee Numbers',
            color: 'text-red-600 dark:text-red-400'
          },
          //{title: 'Area & Table Code', icon: LucidePrinter, href: '/archives', desc: 'Print Members by Area & Table code', color: 'text-red-600 dark:text-red-400'},
        ]
      },
      {
        title: "Monthly Menu",
        icon: LucideCalendar,
        //color: 'text-red-600 dark:text-red-400',
        href: "/admin/monthly-menu",
        subItems: [
          {
            title: 'Key File Setup',
            icon: LucideFile,
            color: 'text-red-600 dark:text-red-400'},
          {
            title: 'Flag All Ports',
            icon: LucideHdmiPort,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Print Log File',
            icon: LucideLogs,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Merge All Audit Trails',
            icon: LucideTrain,
            //href: '/endowment-fund',
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Prepare File for Vari Mail',
            icon: LucideMail,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Extract New and Deleted',
            icon: LucideTable,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Print Location Listing',
            icon: LucideLocate,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Print Member Roll (No Adding)' ,
            icon: LucidePaintRoller,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: 'Print Membership Summary',
            icon: LucideUserRound,
            color: 'text-red-600 dark:text-red-400'
          },
        ]
      },
      // { title: "BankBranch", icon: Landmark, color: 'text-red-600 dark:text-red-400'},
      { title: "Utilities", icon: LucideToolbox, color: 'text-red-600 dark:text-red-400'},
      { title: "A.C.B", icon: LucideFile, color: 'text-red-600 dark:text-red-400' },
      { title: "Regional Branches", icon: LucideGitBranch, color: 'text-red-600 dark:text-red-400'  },
      { title: "Tape", icon: LucideCassetteTape, color: 'text-red-600 dark:text-red-400' },
      { title: "D.B.F", icon: LucideFile, color: 'text-red-600 dark:text-red-400' },
      { title: "Selective Print", icon: TextSelect, color: 'text-red-600 dark:text-red-400' },
      { title: "Committee", icon: LucideChartNoAxesGantt, color: 'text-red-600 dark:text-red-400'},
      { title: "Ad-Hoc Label", icon: LucideTag, color: 'text-red-600 dark:text-red-400'},
      { title: "Bank Transfer", icon: ArrowRightLeft, color: 'text-red-600 dark:text-red-400'},
      { title: "Letters for Return Debits", icon: Mailbox, color: 'text-red-600 dark:text-red-400'},
      { title: "Maintenance", href:'/maintenance', icon: LucideConstruction}
    ]
  },
  {
    title: "Bank/Branch",
    icon: Landmark,
    href: "/banks",
    subItems: [
      // { title: "New Bank", icon: LucideFile, href: "/banks/new" },
      {
        title: "Bank Listing",
        icon: MapPinnedIcon,
        href: "/banks/listing"
      },
      { title: 'Tb Code/Lab Ind (Bank)', icon: Archive, desc: 'Extract by Tb Code/Lab Ind (Bank)' , color: 'text-red-600 dark:text-red-400'},
      { title: 'Tb Code/Lab Ind (Mail)', icon: Archive, desc: 'Extract by Tb Code/Lab Ind (Mail)', color: 'text-red-600 dark:text-red-400' }
    ]
  },
  { 
    title: "Members", 
    icon: Users, 
    href: "/members",
    subItems: [
      // { title: "Member Application", icon: UsersRoundIcon, href: "/members/apply" },
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
