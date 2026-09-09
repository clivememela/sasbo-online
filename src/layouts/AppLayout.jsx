import '../assets/styles/App.css'
import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Main from "../components/Main";

export default function AppLayout() {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [selectedCardHref, setSelectedCardHref] = useState(null);

  // h-screen is deliberately UNCHANGED here: swapping it for h-dvh is a real fix for mobile
  // browser chrome (responsiveness.md, R-RESP-F) and it is P5's, not P1's. This phase migrates
  // colour to tokens and changes nothing else.
  return (
    <div className="bg-bg h-screen">
      <Sidebar
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
        selectedCardHref={selectedCardHref}
      />
      <Main
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
        setSelectedCardHref={setSelectedCardHref}
      />
    </div>
  );
}
