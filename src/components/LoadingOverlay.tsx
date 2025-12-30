import React from "react";

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Optional loading message to display */
  message?: string;
}

/**
 * Global loading overlay component for long-running operations
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col items-center gap-4 min-w-64">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-blue-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin" />
        {/* Message */}
        {message && (
          <p className="text-gray-900 dark:text-gray-100 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
