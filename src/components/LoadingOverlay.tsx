import React from "react";

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Optional loading message to display */
  message?: string;
  /** Progress percentage (0-100) */
  progress?: number;
}

/**
 * Global loading overlay component for long-running operations
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message, progress = 0 }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col items-center gap-2 min-w-80">
        {/* Progress Bar */}
        <div className="w-full">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>{message || "Processing..."}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            {/* Animated shimmer overlay */}
            <div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ animationDuration: "1.5s" }}
            />
            <div
              className="h-full bg-blue-600 dark:bg-indigo-500 transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Animated gradient flow on progress bar */}
              <div className="absolute inset-0 bg-linear-to-r from-blue-400 via-blue-300 to-blue-400 dark:from-indigo-400 dark:via-indigo-300 dark:to-indigo-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
