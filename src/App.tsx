import { useEffect, useState, useRef } from "react";
import { MusicPiece, PlaylistWithMusic } from "../shared/model";
import PlaylistGrid from "./components/PlaylistGrid";
import PlaylistList from "./components/PlaylistList";
import LoadingOverlay from "./components/LoadingOverlay";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setQueue, jumpToIndex, setIsPlaying, setLoading } from "./store/slices/musicPlayer";
import { useGetAllMusicPiecesQuery, useGetAllPlaylistsQuery } from "./store/slices/apiSlice";
import PlayBar from "./PlayBar";
import SideBar from "./SideBar";
import TopBar from "./TopBar";
import GroupedView from "./views/GroupedView";
import BasicView from "./views/BasicView";

function App() {
  const dispatch = useAppDispatch();
  const { activePlaylist, viewMode, queue, queueSourcePlaylist, isLoading, loadingMessage, loadingProgress, isPlaying } = useAppSelector((state) => ({
    activePlaylist: state.musicPlayer.activePlaylist,
    viewMode: state.musicPlayer.viewMode,
    queue: state.musicPlayer.queue,
    queueSourcePlaylist: state.musicPlayer.queueSourcePlaylist,
    isPlaying: state.musicPlayer.isPlaying,
    // Loading state only for import operations (from musicPlayerSlice)
    isLoading: state.musicPlayer.isLoading,
    loadingMessage: state.musicPlayer.loadingMessage,
    loadingProgress: state.musicPlayer.loadingProgress,
  }));
  const [isSideBarCollapsed, setIsSideBarCollapsed] = useState(false);
  const [playlistsWithMusic, setPlaylistsWithMusic] = useState<PlaylistWithMusic[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);

  // RTK Query hooks for data fetching (fast, no loading state shown)
  const { data: musicPieces = [] } = useGetAllMusicPiecesQuery();
  const { data: playlists = [] } = useGetAllPlaylistsQuery();

  // Fetch playlist with music data when playlists change
  useEffect(() => {
    const fetchPlaylistsWithMusic = async () => {
      const data = await Promise.all(
        playlists.map((p) => window.ipcRenderer.invoke("getPlaylistWithMusic", p.id)),
      );
      setPlaylistsWithMusic(data);
    };

    if (playlists.length > 0) {
      fetchPlaylistsWithMusic();
    }
  }, [playlists]);

  // Listen for import progress events from main process (slow operations with progress)
  useEffect(() => {
    const handleImportProgress = (
      _event: unknown,
      progress: { stage: string; progress: number; message?: string },
    ) => {
      dispatch(
        setLoading({
          isLoading: true,
          message: progress.message || `${progress.stage}...`,
          progress: progress.progress,
        }),
      );
    };

    window.ipcRenderer.on("import-progress", handleImportProgress);

    return () => {
      window.ipcRenderer.off("import-progress", handleImportProgress);
    };
  }, [dispatch]);

  // Sync volume state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Global keyboard handler for media controls
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        dispatch(setIsPlaying(!isPlaying));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((prev) => Math.min(1, prev + 0.1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((prev) => Math.max(0, prev - 0.1));
      }
    };

    window.addEventListener("keydown", handleGlobalKeyPress);
    return () => window.removeEventListener("keydown", handleGlobalKeyPress);
  }, [isPlaying, dispatch]);

  const handleMusicClick = (musicPiece: MusicPiece) => {
    // Derive queue based on activePlaylist
    let newQueue: MusicPiece[];
    if (activePlaylist === "Library" || activePlaylist.startsWith("Recently")) {
      newQueue = musicPieces;
    } else {
      const playlist = playlistsWithMusic.find((p) => p.name === activePlaylist);
      newQueue = playlist?.musicPieces.map((item) => item.music) ?? [musicPiece];
    }

    const index = newQueue.findIndex((m) => m.hash === musicPiece.hash);
    const existingIndex = queue.findIndex((m) => m.hash === musicPiece.hash);

    // If clicked music is in current queue, just jump to it
    if (existingIndex >= 0 && queueSourcePlaylist === activePlaylist) {
      dispatch(jumpToIndex(existingIndex));
    } else {
      // Replace queue with new playlist
      dispatch(
        setQueue({
          queue: newQueue,
          index: index >= 0 ? index : 0,
          source: activePlaylist,
        }),
      );
    }
    dispatch(setIsPlaying(true));
  };

  const handlePlaylistClick = (playlist: PlaylistWithMusic) => {
    // Navigate to individual playlist view (future enhancement)
    console.log("Playlist clicked:", playlist.name);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <SideBar playlists={playlists} collapsed={isSideBarCollapsed} />

      {/* Main Content - width = screen-width - sidebar-width */}
      <div
        className={`flex flex-col transition-all duration-300 h-[calc(100vh-5rem)] ${
          isSideBarCollapsed ? "w-[calc(100vw-4rem)]" : "w-[calc(100vw-12.5rem)]"
        }`}
      >
        {/* Top Bar with collapse toggle */}
        <TopBar
          isSideBarCollapsed={isSideBarCollapsed}
          onToggleSidebar={() => setIsSideBarCollapsed(!isSideBarCollapsed)}
        />

        {/* Content Area - height = screen-height - topbar-height - playbar-height */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-full mx-auto">
            {activePlaylist === "Playlists" ? (
              viewMode === "grid" ? (
                <PlaylistGrid
                  playlists={playlistsWithMusic}
                  onPlaylistClick={handlePlaylistClick}
                />
              ) : (
                <PlaylistList
                  playlists={playlistsWithMusic}
                  onPlaylistClick={handlePlaylistClick}
                />
              )
            ) : activePlaylist === "Recently Added" || activePlaylist === "Recently Played" ? (
              <GroupedView
                type={activePlaylist === "Recently Added" ? "recently-added" : "recently-played"}
                viewMode={viewMode}
                onMusicClick={handleMusicClick}
                allMusic={musicPieces}
              />
            ) : (
              <BasicView
                viewMode={viewMode}
                onMusicClick={handleMusicClick}
                musicPieces={
                  activePlaylist === "Library"
                    ? musicPieces
                    : (playlistsWithMusic
                        .find((p) => p.name === activePlaylist)
                        ?.musicPieces.map((item) => item.music) ?? musicPieces)
                }
              />
            )}
          </div>
        </div>

        {/* PlayBar */}
        <PlayBar audioRef={audioRef} volume={volume} onVolumeChange={setVolume} />
      </div>

      {/* Global Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} progress={loadingProgress} />
    </div>
  );
}

export default App;
