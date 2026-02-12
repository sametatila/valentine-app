"use client";

import type { Question } from "@/types";

interface QuestionCardProps {
  question: Question;
  currentStep: number;
  onAnswer: (positive: boolean) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  currentStep,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  return (
    <div className="mx-auto max-w-xl px-4">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`inline-block rounded-full transition-all duration-300 ${
              i === currentStep
                ? "h-3 w-8 bg-valentine-red"
                : i < currentStep
                  ? "h-3 w-3 bg-valentine-pink"
                  : "h-3 w-3 bg-pink-200"
            }`}
          />
        ))}
      </div>

      <div className="mb-4 flex justify-center">
        <span className="inline-block rounded-full bg-valentine-red/90 px-4 py-1 text-xs font-semibold text-white shadow-md">
          Soru {currentStep + 1} / 5
        </span>
      </div>

      {/* Question card */}
      <div className="mb-8 rounded-3xl border-2 border-valentine-pink/40 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-10">
        <h2 className="text-center text-xl font-bold leading-relaxed text-gray-800 sm:text-2xl">
          {question.text}
        </h2>
      </div>

      {/* Answer buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          disabled={disabled}
          className="rounded-full bg-valentine-red px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:ring-4 focus:ring-valentine-pink focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question.positiveLabel}
        </button>

        <button
          type="button"
          onClick={() => onAnswer(false)}
          disabled={disabled}
          className="rounded-full bg-gray-400 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:ring-4 focus:ring-gray-300 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question.negativeLabel}
        </button>
      </div>
    </div>
  );
}
