"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useCallback, useEffect, useState } from "react";
import { useLockStatus } from "@/hooks/useLockStatus";

const FS_KEY = "enter-pos-fullscreen";

export function Header() {
  const router = useRouter();
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

  // Real browser fullscreen toggle — with persistence
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      localStorage.setItem(FS_KEY, "1");
    } else {
      document.exitFullscreen().catch(() => {});
      localStorage.removeItem(FS_KEY);
    }
  }, []);

  // Listen for fullscreen changes (also handles Esc key exit)
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) localStorage.removeItem(FS_KEY);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Restore fullscreen on mount (page reload)
  useEffect(() => {
    if (localStorage.getItem(FS_KEY) === "1" && !document.fullscreenElement) {
      const t = setTimeout(() => {
        document.documentElement.requestFullscreen().catch(() => {
          localStorage.removeItem(FS_KEY);
        });
      }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  // Shared icon button style
  const iconBtn = "grid size-10 sm:size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:hover:text-primary transition-colors";

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

      <div className="flex flex-1 items-center justify-end gap-1.5 min-[375px]:gap-2 sm:gap-3">
        {/* Navigation: Back / Home / Refresh / Forward — desktop only */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Back */}
          <button
            onClick={() => router.back()}
            title="Go Back"
            className={iconBtn}
          >
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {/* Home */}
          <button
            onClick={() => router.push("/")}
            title="Dashboard Home"
            className={iconBtn}
          >
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>

          {/* Refresh */}
          <button
            onClick={() => router.refresh()}
            title="Refresh Page"
            className={iconBtn}
          >
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          {/* Forward */}
          <button
            onClick={() => router.forward()}
            title="Go Forward"
            className={iconBtn}
          >
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-0.5 hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        <ThemeToggleSwitch />

        {/* Real Browser Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Alt+F)" : "Enter Fullscreen (Alt+F)"}
          className={iconBtn}
        >
          {isFullscreen ? (
            <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
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
            className={iconBtn}
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
