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
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 800 800" fill="currentColor">
              <path d="M396.7 666.7c-8.3 0-16.7-3.3-23.3-10L123.4 406.7c-6-6-10-14.4-10-23.3 0-9 3.7-17.4 10-23.4l250-250c13-13 33.7-13 46.7 0s13 33.7 0 46.7L193.4 383.3H650c18.3 0 33.4 15 33.4 33.4 0 18.3-15 33.3-33.4 33.3H193.4l226.7 226.7c13 13 13 33.6 0 46.6-6.4 6.7-15 10-23.4 10z"/>
            </svg>
          </button>

          {/* Home */}
          <button
            onClick={() => router.push("/")}
            title="Dashboard Home"
            className={iconBtn}
          >
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 800 800" fill="none" stroke="currentColor" strokeWidth={50} strokeLinecap="round" strokeLinejoin="round">
              <path d="M400 100L120 340C100 356 90 380 90 405V640C90 695 135 740 190 740H610C665 740 710 695 710 640V405C710 380 700 356 680 340L400 100Z"/>
              <path d="M310 520C340 560 370 580 400 580C430 580 460 560 490 520"/>
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
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 800 800" fill="currentColor" style={{ transform: "rotate(180deg)" }}>
              <path d="M396.7 666.7c-8.3 0-16.7-3.3-23.3-10L123.4 406.7c-6-6-10-14.4-10-23.3 0-9 3.7-17.4 10-23.4l250-250c13-13 33.7-13 46.7 0s13 33.7 0 46.7L193.4 383.3H650c18.3 0 33.4 15 33.4 33.4 0 18.3-15 33.3-33.4 33.3H193.4l226.7 226.7c13 13 13 33.6 0 46.6-6.4 6.7-15 10-23.4 10z"/>
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
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14v3a3 3 0 0 0 3 3h3" />
              <path d="M20 14v3a3 3 0 0 1-3 3h-3" />
              <path d="M4 10V7a3 3 0 0 1 3-3h3" />
              <path d="M20 10V7a3 3 0 0 0-3-3h-3" />
            </svg>
          ) : (
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
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
            <svg className="h-5 w-5 sm:h-[22px] sm:w-[22px]" viewBox="0 0 800 800" fill="none" stroke="currentColor" strokeWidth={50} strokeLinecap="round" strokeLinejoin="round">
              <rect x="100" y="340" width="600" height="370" rx="80"/>
              <path d="M260 340V260C260 145 325 60 400 60C475 60 540 145 540 260V340"/>
              <circle cx="320" cy="530" r="25" fill="currentColor" stroke="none"/>
              <circle cx="400" cy="530" r="25" fill="currentColor" stroke="none"/>
              <circle cx="480" cy="530" r="25" fill="currentColor" stroke="none"/>
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
