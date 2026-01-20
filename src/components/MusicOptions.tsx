import React, { useEffect, useRef, useState } from "react";
import { MusicPiece } from "@@/shared/model";
import { useAppSelector } from "../store/hooks";
import Dialog from "./Dialog";
import { SYSTEM_PLAYLISTS } from "../SideBar";

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
 * Displays context menu with actions like showing music folder or deleting music
 */
const MusicOptions: React.FC<MusicOptionsProps> = ({ music, position, onClose }) => {
  const activePlaylist = useAppSelector((state) => state.musicPlayer.activePlaylist);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  /**
   * Handle showing the music folder in system file explorer
   */
  const handleShowMusicFolder = async () => {
    try {
      // Get the music directory path for this hash
      const musicDir = await window.ipcRenderer.invoke("getMusicDir", music.hash);
      // Open the path in system file explorer
      await window.ipcRenderer.invoke("openInExplorer", musicDir);
      onClose();
    } catch (error) {
      console.error("Failed to open music folder:", error);
    }
  };

  /**
   * Handle deleting the music piece from database and playlists
   */
  const handleDeleteMusic = async () => {
    // Open confirmation dialog
    setIsDeleteDialogOpen(true);
  };

  /**
   * Confirm and execute the delete operation
   */
  const confirmDelete = async () => {
    try {
      // Check if we're in a system playlist or a user playlist
      const isSystemPlaylist = SYSTEM_PLAYLISTS.some((sp) => sp.name === activePlaylist);

      if (isSystemPlaylist) {
        // Delete the music piece from database completely
        await window.ipcRenderer.invoke("deleteMusicPiece", music.id);
      } else {
        // Get the current playlist and remove music from that playlist only
        const playlist = await window.ipcRenderer.invoke("getPlaylistByName", activePlaylist);
        await window.ipcRenderer.invoke("removeMusicFromPlaylist", playlist.id, music.id);
      }

      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete music piece:", error);
      setIsDeleteDialogOpen(false);
      alert("Failed to delete music piece. Please try again.");
    }
  };

  /**
   * Cancel the delete operation
   */
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if delete dialog is open
      if (isDeleteDialogOpen) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      // Close delete dialog on escape if open, otherwise close menu
      if (event.key === "Escape") {
        if (isDeleteDialogOpen) {
          setIsDeleteDialogOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, isDeleteDialogOpen]);

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

  // Determine dialog message based on context
  const isSystemPlaylist = SYSTEM_PLAYLISTS.some((sp) => sp.name === activePlaylist);
  const dialogTitle = isSystemPlaylist ? "Delete Music" : "Remove from Playlist";
  const dialogMessage = isSystemPlaylist
    ? `Are you sure you want to delete "${music.name}" by ${music.author}? This will remove it from all playlists and delete the audio files. This action cannot be undone.`
    : `Are you sure you want to remove "${music.name}" by ${music.author} from the "${activePlaylist}" playlist?`;

  return (
    <>
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
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
          onClick={handleDeleteMusic}
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
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>{isSystemPlaylist ? "Delete music" : "Remove from playlist"}</span>
        </button>
      </div>

      <Dialog
        type="confirm"
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        confirm={{
          title: dialogTitle,
          message: dialogMessage,
          confirmText: isSystemPlaylist ? "Delete" : "Remove",
          cancelText: "Cancel",
          isDestructive: true,
          onConfirm: confirmDelete,
          onCancel: cancelDelete,
        }}
      />
    </>
  );
};

export default MusicOptions;
