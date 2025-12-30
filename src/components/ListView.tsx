import React, { useState } from "react";
import { MusicPiece } from "@@/shared/model";
import MusicOptions from "./MusicOptions";

interface ListItemProps {
  /** Music piece data to display */
  music: MusicPiece;
  /** Click handler for the item */
  onClick: (music: MusicPiece) => void;
  /** Whether the item is selected/active */
  active?: boolean;
  /** Handler for showing options menu */
  onShowOptions: (music: MusicPiece, event: React.MouseEvent<HTMLButtonElement>) => void;
}

interface ListViewProps {
  /** Array of music pieces to display */
  musicPieces: MusicPiece[];
  /** Click handler for music items */
  onMusicClick: (music: MusicPiece) => void;
  /** Currently selected music hash */
  selectedHash?: string;
  /** Additional CSS class for the list container */
  className?: string;
}

/**
 * Individual list item displaying music thumbnail and information
 */
const ListItem: React.FC<ListItemProps> = ({ music, onClick, active, onShowOptions }) => {
  const handleClick = () => {
    onClick(music);
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 group ${
        active ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500" : ""
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 shrink-0 relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700 mr-3">
        <img
          src={`thumbnail://${music.hash}`}
          alt={music.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-30">
          <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-gray-800"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Music information */}
      <div className="grow min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3
            className="text-base font-medium text-gray-900 dark:text-gray-100 truncate pr-2"
            title={music.name}
          >
            {music.name}
          </h3>
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 shrink-0">
            <span>{formatDuration(music.duration)}</span>
            <span>•</span>
            <span>{formatFileSize(music.fileSize)}</span>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="truncate pr-2" title={music.author}>
            {music.author}
          </span>
          <span className="shrink-0">• {music.playCount} plays</span>
        </div>
      </div>

      {/* More options button */}
      <div className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={(e) => onShowOptions(music, e)}
          aria-label="More options"
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
            className="text-gray-600 dark:text-gray-400"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * List view component displaying music pieces in a vertical list layout
 */
const ListView: React.FC<ListViewProps> = ({
  musicPieces,
  onMusicClick,
  selectedHash,
  className = "",
}) => {
  // State for music options menu
  const [optionsMusic, setOptionsMusic] = useState<MusicPiece | null>(null);
  const [optionsPosition, setOptionsPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  /**
   * Handle showing music options menu
   */
  const handleShowOptions = (
    music: MusicPiece,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    setOptionsMusic(music);
    setOptionsPosition({ x: event.clientX, y: event.clientY });
  };

  /**
   * Handle closing music options menu
   */
  const handleCloseOptions = () => {
    setOptionsMusic(null);
  };

  return (
    <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {musicPieces.map((music) => (
        <ListItem
          key={music.hash}
          music={music}
          onClick={onMusicClick}
          active={selectedHash === music.hash}
          onShowOptions={handleShowOptions}
        />
      ))}
      {/* Music options menu */}
      {optionsMusic && (
        <MusicOptions
          music={optionsMusic}
          position={optionsPosition}
          onClose={handleCloseOptions}
        />
      )}
    </div>
  );
};

export default ListView;
