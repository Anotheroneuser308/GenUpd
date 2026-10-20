import React, { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, Info, X } from 'lucide-react';
import { ToastNotification } from '../types/game';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 4500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    const dismissTimeout = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 250);
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(dismissTimeout);
    };
  }, [toast.id, onDismiss]);

  const handleManualDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const isAchievement = toast.type === 'achievement';
  const isSave = toast.type === 'save';

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 transform ${
        isLeaving ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'
      } ${
        isAchievement
          ? 'bg-slate-950/95 border-amber-500/50 shadow-amber-500/10'
          : isSave
          ? 'bg-slate-950/95 border-emerald-500/40 shadow-emerald-500/10'
          : 'bg-slate-950/95 border-indigo-500/40 shadow-indigo-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon Avatar */}
        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${
            isAchievement
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              : isSave
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
          }`}
        >
          {isAchievement ? (
            <Trophy className="w-5 h-5 animate-pulse text-amber-400" />
          ) : isSave ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Info className="w-5 h-5 text-indigo-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pr-2 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                isAchievement
                  ? 'text-amber-400'
                  : isSave
                  ? 'text-emerald-400'
                  : 'text-indigo-400'
              }`}
            >
              {isAchievement ? 'Achievement Unlocked!' : toast.title}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-slate-100 truncate">
            {isAchievement ? toast.title : toast.message}
          </h4>

          {isAchievement && toast.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              {toast.description}
            </p>
          )}

          {!isAchievement && toast.description && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleManualDismiss}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expiry Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/60">
        <div
          className={`h-full transition-all duration-75 ${
            isAchievement
              ? 'bg-amber-400'
              : isSave
              ? 'bg-emerald-400'
              : 'bg-indigo-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
