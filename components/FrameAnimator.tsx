"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";

export interface FrameAnimatorProps {
  basePath: string;
  frameCount: number;
  fps?: number;
  loop?: boolean;
  holdLastFrame?: boolean;
  paused?: boolean;
  onComplete?: () => void;
  className?: string;
  alt?: string;
}

function FrameAnimatorInner({
  basePath,
  frameCount,
  fps = 16,
  loop = true,
  holdLastFrame = false,
  paused = false,
  onComplete,
  className = "",
  alt = "Animation",
}: FrameAnimatorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const completedRef = useRef(false);

  // ---------- preload ----------
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    let count = 0;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const num = String(i).padStart(3, "0");
      img.src = `${basePath}/frame_${num}.png`;
      img.onload = () => {
        count++;
        if (!cancelled && count === frameCount) {
          imagesRef.current = imgs;
          setLoaded(true);
        }
      };
      img.onerror = () => {
        if (!cancelled) setError(true);
      };
      imgs.push(img);
    }

    return () => {
      cancelled = true;
    };
  }, [basePath, frameCount]);

  // ---------- animation loop ----------
  const tick = useCallback(
    (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const idx = Math.floor((elapsed * fps) / 1000);

      if (loop) {
        setCurrentFrame(idx % frameCount);
        rafRef.current = requestAnimationFrame(tick);
      } else if (idx >= frameCount - 1) {
        if (holdLastFrame) setCurrentFrame(frameCount - 1);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      } else {
        setCurrentFrame(idx);
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [fps, frameCount, loop, holdLastFrame, onComplete],
  );

  useEffect(() => {
    if (!loaded || paused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    // paused → playing geçişinde frame 0'dan başla
    startRef.current = 0;
    completedRef.current = false;
    setCurrentFrame(0);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, paused, tick]);

  // ---------- render ----------
  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-pink-100 text-pink-400 text-sm ${className}`}
      >
        Animasyon yüklenemedi
      </div>
    );
  }

  // Paused iken veya yüklenmediyse: boş div (placeholder yok, layout korunsun)
  if (!loaded) {
    return <div className={className} />;
  }

  const num = String(currentFrame).padStart(3, "0");
  return (
    <div className={`${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/frame_${num}.png`}
        alt={alt}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export const FrameAnimator = memo(FrameAnimatorInner);
