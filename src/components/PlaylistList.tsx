import React from "react";
import { PlaylistWithMusic } from "@@/shared/model";
import PlaylistThumbnailGrid from "./PlaylistThumbnailGrid";

interface PlaylistListItemProps {
  /** Playlist with music data to display */
  playlist: PlaylistWithMusic;
  /** Click handler for the item */
  onClick: (playlist: PlaylistWithMusic) => void;
  /** Whether the item is selected/active */
  active?: boolean;
}

interface PlaylistListProps {
  /** Array of playlists with music to display */
  playlists: PlaylistWithMusic[];
  /** Click handler for playlist items */
  onPlaylistClick: (playlist: PlaylistWithMusic) => void;
  /** Currently selected playlist ID */
  selectedPlaylistId?: number;
  /** Additional CSS class for the list container */
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
 * Individual list item displaying playlist thumbnail and information.
 */
const PlaylistListItem: React.FC<PlaylistListItemProps> = React.memo(
  ({ playlist, onClick, active }) => {
    const handleClick = () => {
      onClick(playlist);
    };

    const thumbnails = extractThumbnailUrls(playlist);

    return (
      <div
        className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
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
        aria-label={`${playlist.name}, ${playlist.songCount} songs`}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 shrink-0 relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700 mr-3">
          <div className="w-full h-full transition-transform duration-200 group-hover:scale-110">
            <PlaylistThumbnailGrid thumbnails={thumbnails} size="list" />
          </div>
        </div>

        {/* Playlist information */}
        <div className="grow min-w-0">
          <h3
            className="text-base font-medium text-gray-900 dark:text-gray-100 truncate"
            title={playlist.name}
          >
            {playlist.name}
          </h3>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span className="truncate pr-2" title={playlist.description || ""}>
              {playlist.description || `${playlist.songCount} songs`}
            </span>
            <span className="shrink-0">
              • {playlist.songCount} songs • {formatTotalDuration(playlist.totalDuration)}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

PlaylistListItem.displayName = "PlaylistListItem";

/**
 * List view component displaying playlists in a vertical list layout.
 */
const PlaylistList: React.FC<PlaylistListProps> = ({
  playlists,
  onPlaylistClick,
  selectedPlaylistId,
  className = "",
}) => {
  return (
    <>
      <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
        {playlists.map((playlist) => (
          <PlaylistListItem
            key={playlist.id}
            playlist={playlist}
            onClick={onPlaylistClick}
            active={selectedPlaylistId === playlist.id}
          />
        ))}
      </div>
    </>
  );
};

export default PlaylistList;
