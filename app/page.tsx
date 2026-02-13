"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, QUESTIONS, INITIAL_STATE } from "@/types";
import { loadState, saveState, clearState } from "@/lib/storage";
import { useShiftF5Reset } from "@/lib/useShiftF5Reset";
import { BearsScene } from "@/components/BearsScene";
import { QuestionCard } from "@/components/QuestionCard";

export default function ValentinePage() {
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioStarted = useRef(false);
  const loadedFlags = useRef({ bg: false, bears: false });

  const checkAllLoaded = useCallback(() => {
    const f = loadedFlags.current;
    if (f.bg && f.bears) setAssetsReady(true);
  }, []);

  useShiftF5Reset();

  // BG preload
  useEffect(() => {
    const img = new Image();
    img.src = "/bg.png";
    img.onload = () => {
      loadedFlags.current.bg = true;
      checkAllLoaded();
    };
    img.onerror = () => {
      loadedFlags.current.bg = true;
      checkAllLoaded();
    };
  }, [checkAllLoaded]);

  // Fallback: 10s sonra ne olursa olsun loading'i kaldır
  useEffect(() => {
    const t = setTimeout(() => setAssetsReady(true), 10000);
    return () => clearTimeout(t);
  }, []);

  // Müzik: ilk tıklamada fade-in ile %50 volume'a ulaş
  useEffect(() => {
    const audio = new Audio("/seviyora.mp3");
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const tryStartMusic = useCallback(() => {
    if (audioStarted.current || !audioRef.current) return;
    audioStarted.current = true;
    const audio = audioRef.current;
    audio.play().then(() => {
      const steps = 40;
      const targetVolume = 0.5;
      const interval = 2000 / steps;
      let step = 0;
      const fadeTimer = setInterval(() => {
        step++;
        audio.volume = Math.min(targetVolume, (step / steps) * targetVolume);
        if (step >= steps) clearInterval(fadeTimer);
      }, interval);
    }).catch(() => {
      audioStarted.current = false;
    });
  }, []);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const handleAnswer = useCallback(
    (positive: boolean) => {
      if (busy || !state) return;
      setBusy(true);

      const willClosenessChange = positive || state.step === 4;

      setState((prev) => {
        if (!prev) return prev;
        const newAnswers = [...prev.answers];
        newAnswers[prev.step] = positive;

        const isPositive = positive || prev.step === 4;
        const newCloseness = isPositive ? prev.closeness + 1 : prev.closeness;
        const newStep = prev.step + 1;

        let newScene = prev.scene;
        if (newStep > 4) {
          newScene = newCloseness === 5 ? "hug" : "done_nonperfect";
        }

        return {
          ...prev,
          step: newStep,
          answers: newAnswers,
          closeness: newCloseness,
          scene: newScene,
        };
      });

      // closeness değişmezse walk/transition yok → kısa bekleme yeterli
      setTimeout(() => setBusy(false), willClosenessChange ? 5200 : 600);
    },
    [busy, state],
  );

  // --- long-press title to reset (2 s) ---
  const onTitleDown = () => {
    longPressTimer.current = setTimeout(() => {
      clearState();
      window.location.reload();
    }, 2000);
  };
  const onTitleUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleBearsReady = useCallback(() => {
    loadedFlags.current.bears = true;
    checkAllLoaded();
  }, [checkAllLoaded]);

  const resetApp = () => {
    clearState();
    window.location.reload();
  };

  // ====== RENDER ======

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 to-red-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-valentine-pink border-t-transparent" />
          <p className="text-lg text-pink-400 animate-pulse">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  // Non-perfect ending
  if (state.scene === "done_nonperfect") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-gray-100 p-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-700 sm:text-5xl">
          Hıııııh çok güzel oldu. Afferim size!
        </h1>
        <p className="mb-8 max-w-md text-lg text-gray-500">
          İlla deneyecen he mi :) Ben sana yol göstermişim zaten, daşların üzerinden niye gidiyon totosunu yediğim.
        </p>
        <button
          type="button"
          onClick={resetApp}
          className="rounded-full bg-gray-600 px-8 py-3 font-bold text-white shadow-lg transition hover:scale-105"
        >
          Baştan Başla
        </button>
      </div>
    );
  }

  // Main scene: questions + bears (hug & heart de burada)
  return (
    <div className="relative flex h-screen flex-col overflow-hidden" onClick={tryStartMusic}>
      {/* Loading overlay — tüm asset'ler yüklenene kadar */}
      {!assetsReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pink-100 to-red-100 transition-opacity duration-700">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-valentine-pink border-t-transparent" />
            <p className="text-lg font-medium text-pink-400 animate-pulse">Yükleniyor…</p>
          </div>
        </div>
      )}

      {/* Arka plan — %20 yakınlaştırılmış, dikey ortalı */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom"
        style={{ transform: "scale(1.2)", transformOrigin: "center center" }}
        draggable={false}
      />
      {/* Header */}
      <header className="py-6 text-center">
        <h1
          className="cursor-pointer text-3xl font-bold text-valentine-red select-none sm:text-5xl"
          onMouseDown={onTitleDown}
          onMouseUp={onTitleUp}
          onMouseLeave={onTitleUp}
          onTouchStart={onTitleDown}
          onTouchEnd={onTitleUp}
        >
          İki Totonun Hikayesi
        </h1>
      </header>

      {/* Bears — tüm kalan alanı kaplar, hug + heart de burada */}
      <section className="relative flex-1">
        <BearsScene
          closeness={state.closeness}
          isHugging={state.scene === "hug"}
          onReady={handleBearsReady}
        />
      </section>

      {/* Question card — absolute, layout akışını etkilemez */}
      {state.scene === "questions" && state.step <= 4 && (
        <div className="absolute inset-x-0 bottom-0 pb-8">
          <QuestionCard
            question={QUESTIONS[state.step]}
            currentStep={state.step}
            onAnswer={handleAnswer}
            disabled={busy}
          />
        </div>
      )}
    </div>
  );
}
