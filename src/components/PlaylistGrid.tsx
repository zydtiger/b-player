import React, { useState } from "react";
import { Playlist, PlaylistWithMusic } from "@@/shared/model";
import PlaylistThumbnailGrid from "./PlaylistThumbnailGrid";
import PlaylistOptions from "./PlaylistOptions";

interface PlaylistGridItemProps {
  /** Playlist with music data to display */
  playlist: PlaylistWithMusic;
  /** Click handler for the item */
  onClick: (playlist: PlaylistWithMusic) => void;
  /** Whether the item is selected/active */
  active?: boolean;
  /** Context menu handler */
  onContextMenu?: (event: React.MouseEvent) => void;
}

interface PlaylistGridProps {
  /** Array of playlists with music to display */
  playlists: PlaylistWithMusic[];
  /** Click handler for playlist items */
  onPlaylistClick: (playlist: PlaylistWithMusic) => void;
  /** Currently selected playlist ID */
  selectedPlaylistId?: number;
  /** Additional CSS class for the grid container */
  className?: string;
}

/**
 * Format total duration from seconds to HH:MM:SS or MM:SS.
 *
 * @param seconds Total duration in seconds
 * @returns Formatted duration string
 */
const formatTotalDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Extract thumbnail URLs from playlist music pieces.
 *
 * @param playlist Playlist with music pieces
 * @returns Array of thumbnail URLs (max 4)
 */
const extractThumbnailUrls = (playlist: PlaylistWithMusic): string[] => {
  return playlist.musicPieces.slice(0, 4).map((item) => `thumbnail://${item.music.hash}`);
};

/**
 * Individual grid item displaying playlist thumbnail and information.
 */
const PlaylistGridItem: React.FC<PlaylistGridItemProps> = React.memo(
  ({ playlist, onClick, active, onContextMenu }) => {
    const handleClick = () => {
      onClick(playlist);
    };

    const thumbnails = extractThumbnailUrls(playlist);

    return (
      <div
        className={`relative group cursor-pointer transition-all duration-200 hover:scale-105 ${
          active ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${playlist.name}, ${playlist.songCount} songs`}
      >
        {/* Thumbnail container */}
        <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
          <PlaylistThumbnailGrid thumbnails={thumbnails} size="grid" />
        </div>

        {/* Playlist info */}
        <div className="mt-2">
          <h3
            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
            title={playlist.name}
          >
            {playlist.name}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {playlist.songCount} songs • {formatTotalDuration(playlist.totalDuration)}
          </p>
        </div>
      </div>
    );
  },
);

PlaylistGridItem.displayName = "PlaylistGridItem";

/**
 * Grid view component displaying playlists in a responsive grid layout.
 */
const PlaylistGrid: React.FC<PlaylistGridProps> = ({
  playlists,
  onPlaylistClick,
  selectedPlaylistId,
  className = "",
}) => {
  // State for playlist options menu
  const [optionsPlaylist, setOptionsPlaylist] = useState<Playlist | null>(null);
  const [optionsPosition, setOptionsPosition] = useState<{ x: number; y: number } | null>(null);

  const handlePlaylistContextMenu = (event: React.MouseEvent, playlist: Playlist) => {
    event.preventDefault();
    event.stopPropagation();
    setOptionsPlaylist(playlist);
    setOptionsPosition({ x: event.clientX, y: event.clientY });
  };

  const closeOptions = () => {
    setOptionsPlaylist(null);
    setOptionsPosition(null);
  };

  return (
    <>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 ${className}`}
      >
        {playlists.map((playlist) => (
          <PlaylistGridItem
            key={playlist.id}
            playlist={playlist}
            onClick={onPlaylistClick}
            active={selectedPlaylistId === playlist.id}
            onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
          />
        ))}
      </div>

      {optionsPlaylist && optionsPosition && (
        <PlaylistOptions
          playlist={optionsPlaylist}
          position={optionsPosition}
          onClose={closeOptions}
        />
      )}
    </>
  );
};

export default PlaylistGrid;
