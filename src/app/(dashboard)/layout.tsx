"use client";

import type { PropsWithChildren } from "react";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { LockWrapper } from "@/components/lock/LockWrapper";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";

function DashboardContent({ children }: PropsWithChildren) {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts({ toggleFullscreen });

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
          <Header />

          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>

      <KeyboardShortcutsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <LockWrapper>
      <DashboardContent>{children}</DashboardContent>
    </LockWrapper>
  );
}
