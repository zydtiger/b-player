import React, { useState } from "react";
import Dialog from "./components/Dialog";

interface TopBarProps {
  /** Whether the sidebar is collapsed */
  isSideBarCollapsed: boolean;
  /** Toggle sidebar collapse state */
  onToggleSidebar: () => void;
}

/**
 * Top bar with sidebar collapse toggle, import buttons, and app title
 */
const TopBar: React.FC<TopBarProps> = ({ isSideBarCollapsed, onToggleSidebar }) => {
  const [isMusicImportOpen, setIsMusicImportOpen] = useState(false);
  const [isPlaylistImportOpen, setIsPlaylistImportOpen] = useState(false);

  const handleMusicImport = (url: string) => {
    // TODO: Implement actual music import functionality
    console.log("Music import URL:", url);
  };

  const handlePlaylistImport = (url: string) => {
    // TODO: Implement actual playlist import functionality
    console.log("Playlist import URL:", url);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isSideBarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
                isSideBarCollapsed ? "rotate-180" : ""
              }`}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMusicImportOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
            aria-label="Import music"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>Import Music</span>
          </button>
          <button
            onClick={() => setIsPlaylistImportOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white transition-colors flex items-center gap-1.5"
            aria-label="Import playlist"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>Import Playlist</span>
          </button>
        </div>
      </div>

      <Dialog
        type="input"
        isOpen={isMusicImportOpen}
        onClose={() => setIsMusicImportOpen(false)}
        input={{
          title: "Import Music",
          message: "Enter music URL:",
          onConfirm: handleMusicImport,
        }}
      />

      <Dialog
        type="input"
        isOpen={isPlaylistImportOpen}
        onClose={() => setIsPlaylistImportOpen(false)}
        input={{
          title: "Import Playlist",
          message: "Enter playlist URL:",
          onConfirm: handlePlaylistImport,
        }}
      />
    </>
  );
};

export default TopBar;
