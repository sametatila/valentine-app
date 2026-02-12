"use client";

import { useEffect } from "react";
import { setForceResetFlag } from "./storage";

export function useShiftF5Reset() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === "F5") {
        setForceResetFlag();
        // Browser will handle the reload; the flag will be read on next boot.
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
