import React, { useEffect, useRef, useState } from "react";
import { Playlist } from "@@/shared/model";
import { useUpdatePlaylistMutation, useDeletePlaylistMutation } from "../store/slices/apiSlice";
import Dialog from "./Dialog";

interface PlaylistOptionsProps {
  /** Playlist to show options for */
  playlist: Playlist;
  /** Position of the menu */
  position: { x: number; y: number };
  /** Callback to close the menu */
  onClose: () => void;
}

/**
 * Floating menu for playlist options
 * Displays context menu with actions like rename and delete
 */
const PlaylistOptions: React.FC<PlaylistOptionsProps> = ({ playlist, position, onClose }) => {
  const [updatePlaylist] = useUpdatePlaylistMutation();
  const [deletePlaylist] = useDeletePlaylistMutation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  /**
   * Confirm and execute the rename operation
   */
  const confirmRename = async (newName: string) => {
    try {
      if (!newName.trim()) {
        alert("Playlist name cannot be empty");
        return;
      }

      await updatePlaylist({
        playlistId: playlist.id,
        updates: { name: newName.trim() },
      }).unwrap();

      setIsRenameDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Failed to rename playlist:", error);
      alert("Failed to rename playlist. Please try again.");
    }
  };

  /**
   * Confirm and execute the delete operation
   */
  const confirmDelete = async () => {
    try {
      await deletePlaylist(playlist.id).unwrap();
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      alert("Failed to delete playlist. Please try again.");
    }
  };

  /**
   * Cancel the rename operation
   */
  const cancelRename = () => {
    setIsRenameDialogOpen(false);
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
      // Don't close if dialogs are open
      if (isRenameDialogOpen || isDeleteDialogOpen) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      // Close dialogs on escape if open, otherwise close menu
      if (event.key === "Escape") {
        if (isRenameDialogOpen) {
          setIsRenameDialogOpen(false);
        } else if (isDeleteDialogOpen) {
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
  }, [onClose, isRenameDialogOpen, isDeleteDialogOpen]);

  /**
   * Calculate position to keep menu within viewport
   */
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
    <>
      <div
        ref={menuRef}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-40"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
          onClick={() => setIsRenameDialogOpen(true)}
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Rename</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
          onClick={() => setIsDeleteDialogOpen(true)}
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
          <span>Delete</span>
        </button>
      </div>

      <Dialog
        type="input"
        isOpen={isRenameDialogOpen}
        onClose={cancelRename}
        input={{
          title: "Rename Playlist",
          message: "Enter new playlist name:",
          initialValue: playlist.name,
          onConfirm: confirmRename,
        }}
      />

      <Dialog
        type="confirm"
        isOpen={isDeleteDialogOpen}
        onClose={cancelDelete}
        confirm={{
          title: "Delete Playlist",
          message: `Are you sure you want to delete "${playlist.name}"? This will remove the playlist but keep all music files. This action cannot be undone.`,
          confirmText: "Delete",
          cancelText: "Cancel",
          isDestructive: true,
          onConfirm: confirmDelete,
          onCancel: cancelDelete,
        }}
      />
    </>
  );
};

export default PlaylistOptions;
