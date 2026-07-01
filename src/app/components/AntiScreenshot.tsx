"use client";

import { useState, useEffect } from "react";

export function AntiScreenshot() {
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // 1. Block Print Screen
      if (
        e.key === "PrintScreen" ||
        (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5" || e.key.toLowerCase() === "s")) ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s")
      ) {
        setIsProtected(true);
        setTimeout(() => setIsProtected(false), 3000);
      }

      // 2. Block Inspect Element & DevTools shortcuts
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (Windows) or Cmd+Opt+I (Mac)
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") || (e.metaKey && e.altKey && e.key.toLowerCase() === "i")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Windows) or Cmd+Opt+J (Mac)
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") || (e.metaKey && e.altKey && e.key.toLowerCase() === "j")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C (Windows) or Cmd+Opt+C (Mac)
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") || (e.metaKey && e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (Windows/Linux) or Cmd+Opt+U (Mac) - View Source
      if ((e.ctrlKey && e.key.toLowerCase() === "u") || (e.metaKey && e.altKey && e.key.toLowerCase() === "u")) {
        e.preventDefault();
        return false;
      }
    };

    const handleBlur = () => {
      setIsProtected(true);
    };

    const handleFocus = () => {
      // Small delay to ensure any active screenshot tool finishes capturing blackness
      setTimeout(() => {
        setIsProtected(false);
      }, 500);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (!isProtected) return null;

  return (
    <div className="fixed inset-0 bg-black z-[999999] flex items-center justify-center pointer-events-none">
      <p className="text-zinc-600 font-mono text-sm tracking-widest">CONTENT PROTECTED</p>
    </div>
  );
}
