"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useCallback, useEffect, useState } from "react";
import { useLockStatus } from "@/hooks/useLockStatus";

export function Header() {
  const { toggleSidebar, isOpen, isMobile } = useSidebarContext();
  const { status } = useLockStatus();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lockEnabled = status?.lockEnabled && status?.hasPin;

  const handleLock = useCallback(async () => {
    try {
      await fetch("/api/lock/expire", { method: "POST" });
      window.location.reload();
    } catch {
      // ignore
    }
  }, []);

  // Real browser fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-5 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A] lg:hidden"
        >
          <MenuIcon />
          <span className="sr-only">Toggle Sidebar</span>
        </button>
      )}

      {/* Desktop: Show sidebar button — only when sidebar is closed */}
      {!isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          title="Show Sidebar"
          className="mr-3 grid size-10 place-items-center rounded-lg border border-gray-200 bg-gray-2 text-dark/70 outline-none hover:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white/70 dark:hover:text-primary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path d="m12 9 3 3-3 3" />
          </svg>
        </button>
      )}

      {isMobile && !isOpen && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
            role="presentation"
          />
        </Link>
      )}

      <div className="max-xl:hidden">
        <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
          Dashboard
        </h1>
        <p className="font-medium">Enter Computer POS Solution</p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 min-[375px]:gap-3 sm:gap-4">
        <ThemeToggleSwitch />

        {/* Real Browser Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Alt+F)" : "Enter Fullscreen (Alt+F)"}
          className="grid size-10 sm:size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary transition-colors"
        >
          {isFullscreen ? (
            /* Minimize icon */
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            /* Maximize icon */
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>

        {/* Lock Screen Button */}
        {lockEnabled && (
          <button
            onClick={handleLock}
            title="Lock Screen"
            className="grid size-10 sm:size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
          >
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </button>
        )}

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
