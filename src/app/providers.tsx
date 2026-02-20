"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { ThemeProvider } from "next-themes";

import { useEffect } from "react";
import { useActivityLogStore } from "@/stores/activityLogStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const setIP = useActivityLogStore((state) => state.setIP);

  useEffect(() => {
    // Fetch user IP once on app load
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setIP(data.ip))
      .catch((err) => console.error("Failed to fetch IP:", err));
  }, [setIP]);

  return (
    <ReactQueryProvider>
      <ThemeProvider defaultTheme="light" attribute="class">
        <SidebarProvider>{children}</SidebarProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}
