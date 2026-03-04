"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useCallback } from "react";
import { useLockStatus } from "@/hooks/useLockStatus";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const { status } = useLockStatus(); // shared cached hook — no extra API call

  const lockEnabled = status?.lockEnabled && status?.hasPin;

  const handleLock = useCallback(async () => {
    try {
      await fetch("/api/lock/expire", { method: "POST" });
      window.location.reload();
    } catch {
      // ignore
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-5 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <button
        onClick={toggleSidebar}
        className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A] lg:hidden"
      >
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {isMobile && (
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

      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-4">
        <ThemeToggleSwitch />

        {/* Lock Screen Button — only visible when lock is enabled */}
        {lockEnabled && (
          <button
            onClick={handleLock}
            title="Lock Screen"
            className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
