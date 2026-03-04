"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { apiClient } from "@/lib/api-client";

/* ─── Icons ─────────────────────────────────────────────────────────────── */

const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const CheckIcon = ({ size = 16, strokeWidth = 3, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* ─── Success Animation ─────────────────────────────────────────────────── */

const UnlockSuccess = () => (
  <div className="flex items-center justify-center gap-4 w-full">
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 30 }}
      className="w-16 h-16 bg-green-500 ring-4 ring-green-500/20 text-white flex items-center justify-center rounded-full"
    >
      <CheckIcon size={32} strokeWidth={3} />
    </motion.div>
    <motion.p
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="text-green-400 font-semibold text-lg"
    >
      Unlocked!
    </motion.p>
  </div>
);

/* ─── Error Message ─────────────────────────────────────────────────────── */

const PINError = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className="text-center text-red-400 font-medium mt-2 absolute -bottom-8 w-full"
  >
    Incorrect PIN. Try again.
  </motion.div>
);

/* ─── Individual PIN Input Box ──────────────────────────────────────────── */

function PINInputBox({
  index,
  verifyPIN,
  state,
}: {
  index: number;
  verifyPIN: () => void;
  state: string;
}) {
  const animationControls = useAnimationControls();
  const mounted = useRef(false);

  const springTransition = {
    type: "spring" as const,
    stiffness: 700,
    damping: 20,
    delay: index * 0.05,
  };
  const noDelaySpring = {
    type: "spring" as const,
    stiffness: 700,
    damping: 20,
  };
  const slowSuccess = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    delay: index * 0.06,
  };

  useEffect(() => {
    mounted.current = true;
    animationControls.start({ opacity: 1, y: 0, transition: springTransition });
    return () => {
      mounted.current = false;
      animationControls.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state === "success" && mounted.current) {
      animationControls.start({ x: -(index * 68), transition: slowSuccess });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onFocus = () => {
    if (mounted.current) animationControls.start({ y: -5, transition: noDelaySpring });
  };
  const onBlur = () => {
    if (mounted.current) animationControls.start({ y: 0, transition: noDelaySpring });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    if (e.key === "Backspace" && !value && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    if (/^[0-9]$/.test(value)) {
      e.currentTarget.value = value;
      if (index < 3) {
        document.getElementById(`pin-${index + 1}`)?.focus();
      }
    } else {
      e.currentTarget.value = "";
    }
    verifyPIN();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 4);
    const digits = pasted.split("").filter((c) => /^[0-9]$/.test(c));

    digits.forEach((digit, i) => {
      const target = index + i;
      if (target < 4) {
        const input = document.getElementById(`pin-${target}`) as HTMLInputElement;
        if (input) input.value = digit;
      }
    });

    const nextFocus = Math.min(index + digits.length, 3);
    document.getElementById(`pin-${nextFocus}`)?.focus();
    setTimeout(verifyPIN, 0);
  };

  return (
    <motion.div
      className={`w-14 h-16 rounded-xl ring-2 ring-transparent overflow-hidden transition-all duration-300 ${
        state === "error"
          ? "ring-red-500"
          : state === "success"
            ? "ring-green-500"
            : "focus-within:ring-orange-500 ring-gray-600"
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={animationControls}
    >
      <input
        id={`pin-${index}`}
        type="password"
        inputMode="numeric"
        maxLength={1}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={index === 0}
        className="w-full h-full text-center text-3xl font-semibold outline-none caret-orange-400 bg-gray-800/80 text-white"
        disabled={state === "success" || state === "verifying"}
      />
    </motion.div>
  );
}

/* ─── Main Lock Screen ──────────────────────────────────────────────────── */

interface LockScreenUIProps {
  userName: string;
  onUnlock: () => void;
}

export function LockScreenUI({ userName, onUnlock }: LockScreenUIProps) {
  const [state, setState] = useState<"idle" | "error" | "success" | "verifying">("idle");
  const animationControls = useAnimationControls();

  const getCode = () => {
    let code = "";
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`pin-${i}`) as HTMLInputElement;
      if (input) code += input.value;
    }
    return code;
  };

  const clearInputs = () => {
    for (let i = 0; i < 4; i++) {
      const input = document.getElementById(`pin-${i}`) as HTMLInputElement;
      if (input) input.value = "";
    }
    document.getElementById("pin-0")?.focus();
  };

  const verifyPIN = useCallback(async () => {
    const code = getCode();
    if (code.length < 4) {
      setState("idle");
      return;
    }

    setState("verifying");

    try {
      const res = await apiClient.post<{ success: boolean }>("/api/lock/verify-pin", { pin: code });
      if (res.success) {
        setState("success");
        // Delay to show success animation, then unlock
        setTimeout(() => onUnlock(), 1200);
      }
    } catch {
      setState("error");
      // Shake animation
      await animationControls.start({
        x: [0, 8, -8, 8, -8, 0],
        transition: { duration: 0.3 },
      });
      // Clear and refocus after error
      setTimeout(() => {
        clearInputs();
        setState("idle");
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUnlock]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 9999,
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0a0a0a 100%)",
      }}
    >
      {/* Animated background dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 rounded-3xl p-8 w-full max-w-sm overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(30,30,40,0.95) 0%, rgba(15,15,25,0.98) 100%)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        {/* Glass overlay */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={state === "success" ? { scale: [1, 1.2, 0], opacity: [1, 1, 0] } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25"
            >
              <LockIcon />
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-center text-white mb-1">
            {state === "success" ? "Welcome Back!" : "Screen Locked"}
          </h1>
          <p className="text-center text-gray-400 text-sm mb-7">
            {state === "success" ? "" : (
              <>{userName} • Enter 4-digit PIN</>
            )}
          </p>

          <AnimatePresence mode="wait">
            {state === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center"
                style={{ height: "120px" }}
              >
                <UnlockSuccess />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* PIN Input Area */}
                <div className="flex flex-col items-center justify-center gap-2 mb-8 relative h-20">
                  <motion.div
                    animate={animationControls}
                    className="flex items-center justify-center gap-4"
                  >
                    {Array.from({ length: 4 }).map((_, index) => (
                      <PINInputBox
                        key={`pin-box-${index}`}
                        index={index}
                        verifyPIN={verifyPIN}
                        state={state}
                      />
                    ))}
                  </motion.div>
                  <AnimatePresence>
                    {state === "error" && <PINError />}
                  </AnimatePresence>
                </div>

                {/* Verifying indicator */}
                {state === "verifying" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center"
                  >
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-gray-600 text-xs"
      >
        Enter Computer&apos;s POS System
      </motion.p>
    </div>
  );
}
