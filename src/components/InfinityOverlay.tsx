import React, { useEffect, useState, useRef } from 'react';

interface InfinityOverlayProps {
  onProceed: () => void;
}

export const InfinityOverlay: React.FC<InfinityOverlayProps> = ({ onProceed }) => {
  const [countdown, setCountdown] = useState(4);
  const clickedRef = useRef(false);

  const handleProceed = () => {
    if (clickedRef.current) return;
    clickedRef.current = true;
    onProceed();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!clickedRef.current) {
            clickedRef.current = true;
            onProceed();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onProceed]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-slate-950 animate-fade-in select-none">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest font-mono font-bold text-amber-950/80 bg-amber-400/40 px-3 py-1 rounded-full inline-block">
            Universal Threshold Exceeded
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
            YOU HAVE REACHED INFINITY
          </h1>
          <p className="text-lg font-mono font-semibold text-amber-100">
            1.79e308 Points has broken the boundaries of existence.
          </p>
        </div>

        <div className="bg-amber-950/30 border border-amber-300/40 rounded-2xl p-6 text-white text-sm sm:text-base space-y-3 backdrop-blur-sm shadow-2xl">
          <p>
            All lower generators, points, and prestige currencies have collapsed into a pure cosmic singularity.
          </p>
          <div className="text-2xl font-black font-mono text-amber-200">
            +1 Infinity Point (IP) Awarded
          </div>
          <p className="text-xs text-amber-100/90 font-mono">
            ★ The Infinity Dimension Tab is now permanently unlocked in your navigation.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleProceed}
            disabled={clickedRef.current}
            className={`px-8 py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold font-mono text-sm rounded-xl shadow-2xl transition-transform active:scale-95 cursor-pointer border border-amber-400/30 ${
              clickedRef.current ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            Proceed ({countdown}s)
          </button>
        </div>
      </div>
    </div>
  );
};
