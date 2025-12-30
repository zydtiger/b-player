import React, { useEffect, useRef } from "react";
import { MusicPiece } from "@@/shared/model";

interface MusicOptionsProps {
  /** Music piece to show options for */
  music: MusicPiece;
  /** Position of the menu */
  position: { x: number; y: number };
  /** Callback to close the menu */
  onClose: () => void;
}

/**
 * Floating menu for music item options
 * Displays context menu with actions like showing music folder
 */
const MusicOptions: React.FC<MusicOptionsProps> = ({ music, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Handle showing the music folder in system file explorer
   */
  const handleShowMusicFolder = async () => {
    try {
      // Get the music directory path for this hash
      const musicDir = await window.ipcRenderer.invoke("getMusicDir", music.hash);
      console.log("Music folder path:", musicDir);
      // TODO: Use Electron shell.showItemInFolder() to open in file explorer
      onClose();
    } catch (error) {
      console.error("Failed to get music directory:", error);
    }
  };

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Calculate position to keep menu within viewport
  const calculatePosition = () => {
    const menuWidth = 200;
    const menuHeight = 100;
    const padding = 8;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position if menu would overflow right edge
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) };
  };

  const pos = calculatePosition();

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-40"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
        onClick={handleShowMusicFolder}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Show music folder</span>
      </button>
    </div>
  );
};

export default MusicOptions;
