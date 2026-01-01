import { useState, useEffect } from "react";
import { MusicPiece, Playlist, PlaylistWithMusic } from "../shared/model";
import ListView from "./components/ListView";
import GridView from "./components/GridView";
import PlaylistGrid from "./components/PlaylistGrid";
import LoadingOverlay from "./components/LoadingOverlay";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setQueue, jumpToIndex, setIsPlaying, setLoading } from "./store/slices/musicPlayer";
import PlayBar from "./PlayBar";
import SideBar from "./SideBar";
import TopBar from "./TopBar";
import PlaylistList from "./components/PlaylistList";

function App() {
  const { isLoading, loadingMessage, loadingProgress, activePlaylist, viewMode, queue, queueSourcePlaylist } =
    useAppSelector((state) => ({
      isLoading: state.musicPlayer.isLoading,
      loadingMessage: state.musicPlayer.loadingMessage,
      loadingProgress: state.musicPlayer.loadingProgress,
      activePlaylist: state.musicPlayer.activePlaylist,
      viewMode: state.musicPlayer.viewMode,
      queue: state.musicPlayer.queue,
      queueSourcePlaylist: state.musicPlayer.queueSourcePlaylist,
    }));
  const dispatch = useAppDispatch();
  const [musicPieces, setMusicPieces] = useState<MusicPiece[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsWithMusic, setPlaylistsWithMusic] = useState<PlaylistWithMusic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSideBarCollapsed, setIsSideBarCollapsed] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        dispatch(setLoading({ isLoading: true }));
        const [pieces, playlistData] = await Promise.all([
          window.ipcRenderer.invoke("getAllMusicPieces") as Promise<MusicPiece[]>,
          window.ipcRenderer.invoke("getAllPlaylists") as Promise<Playlist[]>,
        ]);
        setMusicPieces(pieces);
        setPlaylists(playlistData);
        console.log("Music pieces:", pieces);
        console.log("Playlists:", playlistData);

        // Fetch full playlist data with music pieces
        const playlistsWithMusicData = await Promise.all(
          playlistData.map(
            (playlist) =>
              window.ipcRenderer.invoke(
                "getPlaylistWithMusic",
                playlist.id,
              ) as Promise<PlaylistWithMusic>,
          ),
        );
        setPlaylistsWithMusic(playlistsWithMusicData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Error loading data:", err);
      } finally {
        dispatch(setLoading({ isLoading: false }));
      }
    };

    loadData();

    // Listen for import progress events from main process
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
        })
      );
    }
    dispatch(setIsPlaying(true));
  };

  const handlePlaylistClick = (playlist: PlaylistWithMusic) => {
    // Navigate to individual playlist view (future enhancement)
    console.log("Playlist clicked:", playlist.name);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

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
                <PlaylistGrid playlists={playlistsWithMusic} onPlaylistClick={handlePlaylistClick} />
              ) : (
                <PlaylistList playlists={playlistsWithMusic} onPlaylistClick={handlePlaylistClick} />
              )
            ) : viewMode === "grid" ? (
              <GridView musicPieces={musicPieces} onMusicClick={handleMusicClick} />
            ) : (
              <ListView musicPieces={musicPieces} onMusicClick={handleMusicClick} />
            )}
          </div>
        </div>

        {/* PlayBar */}
        <PlayBar />
      </div>

      {/* Global Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} progress={loadingProgress} />
    </div>
  );
}

export default App;
