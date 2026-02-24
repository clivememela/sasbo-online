import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Main({ setSideBarOpen }) {
  return (
    <main className="fixed top-40 bottom-0 left-0 right-0 flex-1 flex flex-col overflow-y-auto lg:left-64">
      <Header setSideBarOpen={setSideBarOpen} />
      <div className="flex-1 w-full flex flex-col pb-14">
        <Outlet />
      </div>
      <Footer />
    </main>
  );
}
