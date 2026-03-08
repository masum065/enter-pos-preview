"use client";

import { Modal } from "@/components/ui/modal";
import { getModifierLabel, type Shortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[28px] items-center justify-center rounded-md border border-gray-300 bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
      {children}
    </kbd>
  );
}

function formatShortcutKeys(shortcut: Shortcut) {
  const modifier = getModifierLabel();
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(modifier);
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");

  // Format key display
  let keyDisplay = shortcut.key;
  if (keyDisplay === "Escape") keyDisplay = "Esc";
  if (keyDisplay === "/") keyDisplay = "/";
  if (keyDisplay === "?") keyDisplay = "?";
  if (keyDisplay.length === 1 && keyDisplay !== "/" && keyDisplay !== "?") {
    keyDisplay = keyDisplay.toUpperCase();
  }

  parts.push(keyDisplay);
  return parts;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  const categories = ["Navigation", "Actions", "General"] as const;

  const categoryIcons: Record<string, string> = {
    Navigation: "🧭",
    Actions: "⚡",
    General: "🔧",
  };

  const categoryDescriptions: Record<string, string> = {
    Navigation: "Navigate between pages",
    Actions: "Quick actions",
    General: "General shortcuts",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="space-y-6 px-1 py-2">
        {categories.map((category) => {
          const categoryShortcuts = shortcuts.filter(
            (s) => s.category === category
          );
          if (categoryShortcuts.length === 0) return null;

          return (
            <div key={category}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{categoryIcons[category]}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {category}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {categoryDescriptions[category]}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {categoryShortcuts.map((shortcut) => {
                  const keys = formatShortcutKeys(shortcut);
                  return (
                    <div
                      key={`${shortcut.key}-${shortcut.alt}-${shortcut.shift}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-xs text-gray-400">+</span>
                            )}
                            <ShortcutKey>{key}</ShortcutKey>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {category !== "General" && (
                <div className="mt-3 border-b border-gray-200 dark:border-gray-700" />
              )}
            </div>
          );
        })}

        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold">💡 Tip:</span> Shortcuts are disabled when you&apos;re typing in a text field. Press <ShortcutKey>Esc</ShortcutKey> to unfocus first.
          </p>
        </div>
      </div>
    </Modal>
  );
}
