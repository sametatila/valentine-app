"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FrameAnimator } from "./FrameAnimator";
import type { AnimationAction } from "@/types";

interface BearsSceneProps {
  closeness: number; // 0–5
  isHugging: boolean;
  onHugComplete?: () => void;
}

const FRAME_COUNT = 81;
const FPS = 16;
const WALK_DURATION_MS = 5000;
const HEART_DELAY_MS = 3500;

const MALE_BUBBLES = [
  "Seni çuk sevorum! 💕",
  "Guranıma sen bir yana dünya beheyy! 😍",
  "Ben Kemal geliyorum! 🥰",
  "İsmail bir tuhaf adamdır! 🤗",
  "Totonu yerim! ❤️",
];

const FEMALE_BUBBLES = [
  "Kahramanım! 💗",
  "Gel artık! 🥺",
  "Seni pezevenklerin elinden gittim aldım! 💖",
  "Ulan İsmail! 😊",
  "Valla evlenecem seninle! 💝",
];

function bearLeft(closeness: number, side: "male" | "female"): number {
  return side === "male"
    ? 10 + closeness * 7.5
    : 90 - closeness * 7.5;
}

export function BearsScene({ closeness, isHugging, onHugComplete }: BearsSceneProps) {
  const [action, setAction] = useState<AnimationAction>("idle");
  const [hugPlaying, setHugPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [heartScale, setHeartScale] = useState(10);
  const [showMessage, setShowMessage] = useState(false);
  const [bubble, setBubble] = useState<{ side: "male" | "female"; text: string } | null>(null);
  const prev = useRef(closeness);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (closeness === prev.current) return;
    prev.current = closeness;
    setAction("walk");
  }, [closeness]);

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== "left") return;

    if (isHugging) {
      setAction("hug");
      setHugPlaying(true);
      heartTimerRef.current = setTimeout(() => {
        setShowHeart(true);
        requestAnimationFrame(() => {
          setHeartScale(100);
        });
      }, HEART_DELAY_MS);
    } else {
      setAction("idle");
    }
  }, [isHugging]);

  const handleHugAnimComplete = useCallback(() => {
    setTimeout(() => {
      setShowMessage(true);
      setTimeout(() => {
        onHugComplete?.();
      }, 3000);
    }, 500);
  }, [onHugComplete]);

  const handleSceneClick = useCallback((e: React.MouseEvent) => {
    if (action !== "idle" || !sceneRef.current) return;

    const rect = sceneRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const relX = clickX / rect.width;

    const malePos = bearLeft(closeness, "male") / 100;
    const femalePos = bearLeft(closeness, "female") / 100;
    const bearHalf = (window.innerWidth >= 640 ? 200 : 140) / 2 / rect.width;

    const nearMale = Math.abs(relX - malePos) < bearHalf;
    const nearFemale = Math.abs(relX - femalePos) < bearHalf;
    if (!nearMale && !nearFemale) return;

    // İki ayı arasındaki orta noktaya göre: sol = male, sağ = female
    const midpoint = (malePos + femalePos) / 2;
    const side: "male" | "female" = relX < midpoint ? "male" : "female";

    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);

    const messages = side === "male" ? MALE_BUBBLES : FEMALE_BUBBLES;
    const text = messages[Math.floor(Math.random() * messages.length)];
    setBubble({ side, text });

    bubbleTimerRef.current = setTimeout(() => {
      setBubble(null);
    }, 2500);
  }, [action, closeness]);

  useEffect(() => {
    return () => {
      if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const transitionStyle = `left ${WALK_DURATION_MS}ms ease-in-out`;
  const isHugActive = action === "hug";
  const isWalking = action === "walk";

  return (
    <div
      ref={sceneRef}
      className="relative h-full w-full overflow-hidden"
      onClick={handleSceneClick}
      style={{ cursor: action === "idle" ? "pointer" : "default" }}
    >
      {/* Heart — preloaded, paused ile bekliyor */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[4000ms] ease-out"
        style={{
          left: "50%",
          top: "50%",
          width: `${heartScale}%`,
          height: `${heartScale}%`,
          zIndex: 10,
          opacity: showHeart ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <FrameAnimator
          basePath="/anim/heart"
          frameCount={FRAME_COUNT}
          fps={FPS}
          loop={false}
          holdLastFrame
          paused={!showHeart}
          className="h-full w-full"
          alt="Kalp animasyonu"
        />
      </div>

      {/* Mesaj */}
      {showMessage && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="mx-auto max-w-3xl px-8 text-center animate-[fadeInUp_1s_ease-in-out_both]">
            <h1 className="text-4xl font-bold leading-tight text-valentine-red drop-shadow-2xl sm:text-5xl md:text-6xl">
              İyi ki varsın totom
            </h1>
          </div>
        </div>
      )}

      {/* Hug — preloaded, paused ile bekliyor */}
      <div
        className="absolute h-[210px] w-[420px] -translate-x-1/2 -translate-y-1/2 sm:h-[300px] sm:w-[600px]"
        style={{
          left: "50%",
          top: "50%",
          zIndex: 5,
          opacity: isHugActive ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <FrameAnimator
          basePath="/anim/hug"
          frameCount={FRAME_COUNT}
          fps={FPS}
          loop={false}
          holdLastFrame
          paused={!hugPlaying}
          onComplete={handleHugAnimComplete}
          className="h-full w-full"
          alt="Ayıcıklar kucaklaşıyor"
        />
      </div>

      {/* Male bear (left side) */}
      <div
        className="absolute h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 sm:h-[200px] sm:w-[200px]"
        style={{
          left: `${bearLeft(closeness, "male")}%`,
          top: "50%",
          transition: transitionStyle,
          opacity: isHugActive ? 0 : 1,
          pointerEvents: "none",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Konuşma baloncuğu */}
        {bubble?.side === "male" && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-[fadeInUp_0.3s_ease-out_both]">
            <div className="relative whitespace-nowrap rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg sm:text-base">
              {bubble.text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
            </div>
          </div>
        )}
        {/* Idle — her zaman mount, walk sırasında gizli */}
        <div style={{ position: "absolute", inset: 0, opacity: isWalking ? 0 : 1 }}>
          <FrameAnimator
            basePath="/anim/male/idle"
            frameCount={FRAME_COUNT}
            fps={FPS}
            loop
            className="h-full w-full"
            alt="Erkek ayıcık idle"
          />
        </div>
        {/* Walk — her zaman mount, idle sırasında paused + gizli */}
        <div style={{ position: "absolute", inset: 0, opacity: isWalking ? 1 : 0 }}>
          <FrameAnimator
            basePath="/anim/male/walk"
            frameCount={FRAME_COUNT}
            fps={FPS}
            loop
            paused={!isWalking}
            className="h-full w-full"
            alt="Erkek ayıcık walk"
          />
        </div>
      </div>

      {/* Female bear (right side) */}
      <div
        className="absolute h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 sm:h-[200px] sm:w-[200px]"
        style={{
          left: `${bearLeft(closeness, "female")}%`,
          top: "50%",
          transition: transitionStyle,
          opacity: isHugActive ? 0 : 1,
          pointerEvents: "none",
        }}
      >
        {/* Konuşma baloncuğu */}
        {bubble?.side === "female" && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-[fadeInUp_0.3s_ease-out_both]">
            <div className="relative whitespace-nowrap rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg sm:text-base">
              {bubble.text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
            </div>
          </div>
        )}
        {/* Idle */}
        <div style={{ position: "absolute", inset: 0, opacity: isWalking ? 0 : 1 }}>
          <FrameAnimator
            basePath="/anim/female/idle"
            frameCount={FRAME_COUNT}
            fps={FPS}
            loop
            className="h-full w-full"
            alt="Dişi ayıcık idle"
          />
        </div>
        {/* Walk */}
        <div style={{ position: "absolute", inset: 0, opacity: isWalking ? 1 : 0 }}>
          <FrameAnimator
            basePath="/anim/female/walk"
            frameCount={FRAME_COUNT}
            fps={FPS}
            loop
            paused={!isWalking}
            className="h-full w-full"
            alt="Dişi ayıcık walk"
          />
        </div>
      </div>
    </div>
  );
}
