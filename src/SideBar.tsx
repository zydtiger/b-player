import React, { useState, useEffect } from "react";
import { Playlist, PlaylistWithMusic } from "@@/shared/model";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setActivePlaylist } from "./store/slices/musicPlayer";
import {
  HomeIcon,
  RecentlyAddedIcon,
  RecentlyPlayedIcon,
  PlaylistsIcon,
} from "./components/icons/SystemPlaylistIcons";
import PlaylistThumbnailGrid from "./components/PlaylistThumbnailGrid";

/**
 * System playlists with SVG icons
 */
const SYSTEM_PLAYLISTS = [
  { id: "library", name: "Library", icon: <HomeIcon /> },
  { id: "recently-added", name: "Recently Added", icon: <RecentlyAddedIcon /> },
  { id: "recently-played", name: "Recently Played", icon: <RecentlyPlayedIcon /> },
  { id: "playlists", name: "Playlists", icon: <PlaylistsIcon /> },
] as const;

interface SideBarProps {
  /** User playlists */
  playlists: Playlist[];
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Additional CSS class for the sidebar */
  className?: string;
}

interface TabItemProps {
  /** Icon element or string */
  icon: React.ReactNode | string;
  /** Tab title */
  title: string;
  /** Whether this tab is active */
  active?: boolean;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Individual sidebar tab item with icon and text
 */
const TabItem: React.FC<TabItemProps> = ({ icon, title, active, collapsed = false, onClick }) => {
  const renderIcon = () => {
    if (typeof icon === "string") {
      // Render emoji or character as icon
      return <span className="text-xl">{icon}</span>;
    }
    // Render React component as icon
    return icon;
  };

  return (
    <div
      className={`relative flex items-center w-full p-2 rounded-lg cursor-pointer transition-all duration-200 ${
        active
          ? "bg-blue-500 text-white shadow-lg"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Icon - centered when collapsed */}
      <div className={`shrink-0 ${collapsed ? "mx-auto" : !collapsed ? "mr-3" : ""}`}>{renderIcon()}</div>

      {/* Title - hidden when collapsed */}
      {!collapsed && <span className="font-medium truncate grow">{title}</span>}
    </div>
  );
};

/**
 * Sidebar with playlist navigation
 */
const SideBar: React.FC<SideBarProps> = ({ playlists = [], collapsed = false, className = "" }) => {
  const dispatch = useAppDispatch();
  const activePlaylist = useAppSelector((state) => state.musicPlayer.activePlaylist);

  // State for playlist thumbnails (Map of playlistId -> array of thumbnail URLs)
  const [playlistThumbnails, setPlaylistThumbnails] = useState<Map<number, string[]>>(new Map());

  // Fetch thumbnails for all playlists
  useEffect(() => {
    const fetchThumbnails = async () => {
      const thumbnailMap = new Map<number, string[]>();

      // Fetch playlist music data in parallel
      const results = await Promise.allSettled(
        playlists.map((playlist) =>
          window.ipcRenderer.invoke("getPlaylistWithMusic", playlist.id) as Promise<PlaylistWithMusic>
        )
      );

      // Extract thumbnail hashes from results
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.musicPieces.length > 0) {
          const hashes = result.value.musicPieces
            .slice(0, 4)
            .map((item) => `thumbnail://${item.music.hash}`);
          thumbnailMap.set(playlists[index].id, hashes);
        } else {
          // Empty playlist - no thumbnails
          thumbnailMap.set(playlists[index].id, []);
        }
      });

      setPlaylistThumbnails(thumbnailMap);
    };

    if (playlists.length > 0) {
      fetchThumbnails();
    }
  }, [playlists]);

  const handlePlaylistClick = (playlistName: string) => {
    dispatch(setActivePlaylist(playlistName));
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-50"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Music Library</h2>
        )}
      </div>

      {/* System Playlists */}
      <div className="grow overflow-y-auto p-2 space-y-1">
        {SYSTEM_PLAYLISTS.map((systemPlaylist) => (
          <TabItem
            key={systemPlaylist.id}
            icon={systemPlaylist.icon}
            title={systemPlaylist.name}
            active={activePlaylist === systemPlaylist.name}
            collapsed={collapsed}
            onClick={() => handlePlaylistClick(systemPlaylist.name)}
          />
        ))}

        {/* Divider */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
          </div>
        )}

        {/* User Playlists - only show pinned */}
        {playlists.filter((playlist) => playlist.isPinned).map((playlist) => (
          <TabItem
            key={playlist.id}
            icon={
              <PlaylistThumbnailGrid
                thumbnails={playlistThumbnails.get(playlist.id) ?? []}
                collapsed={collapsed}
              />
            }
            title={playlist.name}
            active={activePlaylist === playlist.name}
            collapsed={collapsed}
            onClick={() => handlePlaylistClick(playlist.name)}
          />
        ))}
      </div>
    </div>
  );
};

export default SideBar;
