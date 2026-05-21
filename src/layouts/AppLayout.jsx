import '../assets/styles/App.css'
import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Main from "../components/Main";

export default function AppLayout() {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [selectedCardHref, setSelectedCardHref] = useState(null);

  return (
    <div className="bg-gray-300 dark:bg-gray-900 h-screen">
      <Sidebar
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
        selectedCardHref={selectedCardHref}
      />
      <Main setSideBarOpen={setSideBarOpen} setSelectedCardHref={setSelectedCardHref} />
    </div>
  );
}
