import '../assets/styles/App.css'
import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Main from "../components/Main";

export default function AppLayout() {
  const [sideBarOpen, setSideBarOpen] = useState(false);

  return (
    <div className="bg-gray-300 dark:bg-gray-900 h-screen">
      <Sidebar
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
      />
      <Main setSideBarOpen={setSideBarOpen} />
    </div>
  );
}
