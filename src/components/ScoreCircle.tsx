import React from 'react';

export const ScoreCircle = ({ score, label }: { score: number, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="relative flex items-center justify-center">
      <svg className="w-16 h-16">
        <circle className="text-slate-200" strokeWidth="5" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
        <circle
          className="text-indigo-600"
          strokeWidth="5"
          strokeDasharray={175.9}
          strokeDashoffset={175.9 - (175.9 * score) / 100}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="28"
          cx="32"
          cy="32"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-900">{score}%</span>
    </div>
    <span className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-center">{label}</span>
  </div>
);
