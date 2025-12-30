import React, { useState } from "react";
import { MusicPiece } from "@@/shared/model";
import MusicOptions from "./MusicOptions";

interface GridItemProps {
  /** Music piece data to display */
  music: MusicPiece;
  /** Click handler for the item */
  onClick: (music: MusicPiece) => void;
  /** Whether the item is selected/active */
  active?: boolean;
  /** Handler for showing options menu */
  onShowOptions: (music: MusicPiece, event: React.MouseEvent<HTMLDivElement>) => void;
}

interface GridViewProps {
  /** Array of music pieces to display */
  musicPieces: MusicPiece[];
  /** Click handler for music items */
  onMusicClick: (music: MusicPiece) => void;
  /** Currently selected music hash */
  selectedHash?: string;
  /** Additional CSS class for the grid container */
  className?: string;
}

/**
 * Individual grid item displaying music thumbnail and information
 */
const GridItem: React.FC<GridItemProps> = ({ music, onClick, active, onShowOptions }) => {
  const handleClick = () => {
    onClick(music);
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-200 hover:scale-105 ${
        active ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowOptions(music, e);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Thumbnail container */}
      <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
        <img
          src={`thumbnail://${music.hash}`}
          alt={music.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Overlay with duration */}
        <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-tl-md z-10">
          {formatDuration(music.duration)}
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-gray-800"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Music info */}
      <div className="mt-2">
        <h3
          className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
          title={music.name}
        >
          {music.name}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={music.author}>
          {music.author}
        </p>
      </div>
    </div>
  );
};

/**
 * Grid view component displaying music pieces in a responsive grid layout
 */
const GridView: React.FC<GridViewProps> = ({
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
    event: React.MouseEvent<HTMLDivElement>,
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
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 ${className}`}
    >
      {musicPieces.map((music) => (
        <GridItem
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

export default GridView;
