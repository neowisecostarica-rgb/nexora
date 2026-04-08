import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-60 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}