import {
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
  LucideDatabase, LucideMails, LucideMenu,
  LucideUserRoundPlus, LucideFile, LucideTags,
  LucidePiggyBank, LucidePresentation,
  LucideConstruction, LucideCopyCheck
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
          {
            title: 'Recruiters',
            icon: LucidePresentation,
            href: '/recruiters',
            desc: 'Capture/Print Recruiters'
          },
          // {
          //   title: 'Print Members Audit Trail',
          //   icon: LucideUserCheck2,
          //   desc: 'Member Detail Enquiry',
          //   color: 'text-red-600 dark:text-red-400'
          // },
          /*{
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
          },*/
          //{title: 'Area & Table Code', icon: LucidePrinter, href: '/archives', desc: 'Print Members by Area & Table code', color: 'text-red-600 dark:text-red-400'},
        ]
      },
      /*{
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
      },*/
      {
        title: "A.C.B",
        href:'/admin/acb',
        icon: LucideFile,
        subItems: [
          {
            title: "Debits",
            desc: "Manage Re-Debits",
            href: "/admin/acb/debits",
            icon: LucidePiggyBank,
          },
          /*{
            title: "Credits",
            desc: "Manage Credits",
            //href: "/admin/membership/roles",
            icon: LucidePiggyBank,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Subscriptions",
            desc: "Manage Subscriptions",
            //href: "/admin/membership/permissions",
            icon: LucideMails,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Benevolent Funds",
            desc: "Manage Benevolent Funds",
            //href: "/admin/membership/users",
            icon: LucideCalendar,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Death Benefit Funds",
            desc: "Manage Death Benefit Funds",
            //href: "/admin/membership/roles",
            icon: LucideCalendar,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Endowment Funds",
            desc: "Manage Endowment Funds",
            //href: "/admin/membership/permissions",
            icon: LucideCalendar,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Criticare",
            desc: "Manage Criticare",
            //href: "/admin/membership/permissions",
            icon: LucideCross,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            title: "Accounts",
            desc: "Manage Accounts",
            //href: "/admin/membership/permissions",
            icon: LucideBuilding,
            color: 'text-red-600 dark:text-red-400'
          },*/
        ]
      },
      {
        title: "Maintenance",
        desc: "Manage System",
        href:'/admin/maintenance',
        icon: LucideConstruction,
        subItems: [
          {
            title: 'Bank/Branch',
            icon: Landmark,
            desc: 'Maintain Bank/Branch'
          },
          {
            title: 'Recruitment Channel',
            icon: LucideCopyCheck,
            desc: 'Maintain Recruitment Channels',
            href: '/admin/maintenance/recruitment-channel'
          },
          {
            title: 'Subscriptions',
            icon: LucideMails,
            href: '/admin/maintenance/subscriptions',
            desc: 'Maintain Subscription Table',
          },
        ],
      },
      // { title: "BankBranch", icon: Landmark, color: 'text-red-600 dark:text-red-400'},
      //{ title: "Utilities", icon: LucideToolbox, color: 'text-red-600 dark:text-red-400'},
      //{ title: "Regional Branches", icon: LucideGitBranch, color: 'text-red-600 dark:text-red-400'  },
      //{ title: "Tape", icon: LucideCassetteTape, color: 'text-red-600 dark:text-red-400' },
      //{ title: "D.B.F", icon: LucideFile, color: 'text-red-600 dark:text-red-400' },
      //{ title: "Selective Print", icon: TextSelect, color: 'text-red-600 dark:text-red-400' },
      //{ title: "Committee", icon: LucideChartNoAxesGantt, color: 'text-red-600 dark:text-red-400'},
      //{ title: "Ad-Hoc Label", icon: LucideTag, color: 'text-red-600 dark:text-red-400'},
      //{ title: "Bank Transfer", icon: ArrowRightLeft, color: 'text-red-600 dark:text-red-400'},
      //{ title: "Letters for Return Debits", icon: Mailbox, color: 'text-red-600 dark:text-red-400'},

    ]
  },
  {
    title: "A.C.B",
    href:'/admin/acb',
    icon: LucideFile,
    subItems: [
      {
        title: "Debits",
        desc: "Manage Re-Debits",
        href: "/admin/acb/debits",
        icon: LucidePiggyBank,
      },
      /*{
        title: "Credits",
        desc: "Manage Credits",
        //href: "/admin/membership/roles",
        icon: LucidePiggyBank,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Subscriptions",
        desc: "Manage Subscriptions",
        //href: "/admin/membership/permissions",
        icon: LucideMails,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Benevolent Funds",
        desc: "Manage Benevolent Funds",
        //href: "/admin/membership/users",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Death Benefit Funds",
        desc: "Manage Death Benefit Funds",
        //href: "/admin/membership/roles",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Endowment Funds",
        desc: "Manage Endowment Funds",
        //href: "/admin/membership/permissions",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Criticare",
        desc: "Manage Criticare",
        //href: "/admin/membership/permissions",
        icon: LucideCross,
        color: 'text-red-600 dark:text-red-400'
      },
      {
        title: "Accounts",
        desc: "Manage Accounts",
        //href: "/admin/membership/permissions",
        icon: LucideBuilding,
        color: 'text-red-600 dark:text-red-400'
      },*/
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
      //{ title: 'Tb Code/Lab Ind (Bank)', icon: Archive, desc: 'Extract by Tb Code/Lab Ind (Bank)' , color: 'text-red-600 dark:text-red-400'},
      //{ title: 'Tb Code/Lab Ind (Mail)', icon: Archive, desc: 'Extract by Tb Code/Lab Ind (Mail)', color: 'text-red-600 dark:text-red-400' }
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
    ]
  },
  // {
  //   title: "Maintenance",
  //   desc: "Manage System",
  //   href:'/admin/maintenance',
  //   icon: LucideConstruction,
  //   subItems: [
  //     {
  //       title: 'Bank/Branch',
  //       icon: Landmark,
  //       desc: 'Maintain Bank/Branch'
  //     },
  //     {
  //       title: 'Recruitment Channel',
  //       icon: LucideCopyCheck,
  //       desc: 'Maintain Recruitment Channels',
  //       href: '/admin/maintenance/recruitment-channel'
  //     },
  //   ],
  // },
  { 
    title: "Members", 
    icon: Users, 
    href: "/members",
    subItems: [
      // { title: "Member Application", icon: UsersRoundIcon, href: "/members/apply" },
      { title: "Capture Member", icon: LucideUserRoundPlus, href: "/members/capture" },
      // { title: 'Members', icon: LucideDoorOpen, href: '/archives', desc: 'Extract Members that have resigned Society' },
      // { title: 'Members', icon: LucideFile, href: '/archives', desc: 'BPS Paid Up Members' },
      // 🔴 NO `href`, AND THAT IS THE FIX RATHER THAN A REMOVAL. `/member/label` has never
      // been a route: App.jsx declares none, there is no catch-all, and clicking this in the
      // rail rendered a BLANK PAGE -- the shell with nothing in it, no error, no message.
      // card.html's rail shows Labels under Members, so the entry belongs; what it must not
      // do is promise a screen that does not exist. `SidebarItem` renders an entry with no
      // href as a quiet, non-navigating label, which is what Maintenance > Bank/Branch has
      // always been. It becomes a link again the day the route lands.
      { title: 'Labels', icon: LucideTags, desc: 'Print Member Labels - Selection' }
    ]
  },
  {
    title: 'Recruiters',
    icon: LucidePresentation,
    href: '/recruiters',
    desc: 'Capture/Print Recruiters'
  },
  {
    title: 'Subscriptions',
    icon: LucideMails,
    href: '/admin/maintenance/subscriptions',
    desc: 'Maintain Subscription Table'
  },
  { 
    title: "Reports", 
    icon: ChartNoAxesCombined, 
    href: "/reports",
    subItems: [
      // 🗣️ "Location Visit", not "Organizer Report" -- SASBO, 18 Sep 2026 ("change only"): the name
      // confused the people filling it in. The route keeps its old name so no bookmark or tool breaks.
      { title: "Location Visit", icon: NotebookPen, href: "/reports/organizer-report" },
      { title: "Forms", icon: Form, href: "/reports/forms" },
      { title: "Location Listing", icon: MapPinnedIcon, href: "/reports/locations" }
    ]
  }
];

export const authItems = [
  { title: "Log out", icon: LogOutIcon, href: "/login" },
];
