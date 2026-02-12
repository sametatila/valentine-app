"use client";

import { useState } from "react";
import { FrameAnimator } from "./FrameAnimator";

interface HeartOverlayProps {
  message?: string;
}

export function HeartOverlay({
  message = "İyi ki varsın totom",
}: HeartOverlayProps) {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-valentine-pink to-valentine-red">
      {/* Heart frame animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <FrameAnimator
          basePath="/anim/heart"
          frameCount={81}
          fps={16}
          loop={false}
          holdLastFrame
          onComplete={() => setShowMessage(true)}
          className="h-full w-full max-w-[800px]"
          alt="Kalp animasyonu"
        />
      </div>

      {/* Message text */}
      {showMessage && (
        <div className="relative z-10 mx-auto max-w-3xl px-8 text-center animate-[fadeInUp_1s_ease-in-out_both]">
          <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl">
            {message}
          </h1>
        </div>
      )}
    </div>
  );
}
