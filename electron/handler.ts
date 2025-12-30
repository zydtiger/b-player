import { ipcMain, shell, IpcMainInvokeEvent } from "electron";
import { databaseManager, MusicService, PlaylistService } from "./db";
import { getMusicDir } from "./utils";
import { importMusic, importPlaylist } from "./scrape";
import { MusicPiece, Playlist, PlaylistWithMusic } from "../shared/model";
import { DownloadProgress } from "./utils";

/**
 * Initializes IPC main handlers for communication with the renderer process.
 * Sets up all the handlers that respond to requests from the frontend.
 */
export function initializeIpcMainHandlers(): void {
  /**
   * Handler for retrieving all music pieces from the database.
   *
   * @returns Promise<MusicPiece[]> Array of all music pieces in the database
   * @throws Error if database is not initialized or query fails
   */
  ipcMain.handle("getAllMusicPieces", async (): Promise<MusicPiece[]> => {
    // Create music service instance with database connection
    const musicService = new MusicService(databaseManager.getDatabase());

    // Retrieve all music pieces from database
    const musicPieces = await musicService.getAllMusicPieces();

    return musicPieces;
  });

  /**
   * Handler for retrieving all playlists from the database.
   *
   * @returns Promise<Playlist[]> Array of all playlists in the database
   * @throws Error if database is not initialized or query fails
   */
  ipcMain.handle("getAllPlaylists", async (): Promise<Playlist[]> => {
    // Create playlist service instance with database connection
    const playlistService = new PlaylistService(databaseManager.getDatabase());

    // Retrieve all playlists from database
    const playlists = await playlistService.getAllPlaylists();

    return playlists;
  });

  /**
   * Handler for retrieving a playlist with its associated music pieces.
   *
   * @param playlistId The ID of the playlist to retrieve
   * @returns Promise<PlaylistWithMusic> The playlist with all music pieces
   * @throws Error if database is not initialized or playlist not found
   */
  ipcMain.handle(
    "getPlaylistWithMusic",
    async (_event, playlistId: number): Promise<PlaylistWithMusic> => {
      // Create playlist service instance with database connection
      const playlistService = new PlaylistService(databaseManager.getDatabase());

      // Retrieve playlist with music pieces from database
      const playlist = await playlistService.getPlaylistWithMusic(playlistId);

      return playlist;
    },
  );

  /**
   * Handler for retrieving the music directory path for a given hash.
   *
   * @param hash Unique identifier used as directory name for organizing files
   * @returns Promise<string> Absolute path to the hash-based music directory
   */
  ipcMain.handle("getMusicDir", async (_event, hash: string): Promise<string> => {
    // Get the directory path for the given hash
    const musicDir = getMusicDir(hash);
    return musicDir;
  });

  /**
   * Handler for opening a path in the system file explorer.
   *
   * @param path Absolute path to open in file explorer
   * @returns Promise<void>
   */
  ipcMain.handle("openInExplorer", async (_event, filePath: string): Promise<void> => {
    // Open the path in the system's default file explorer
    shell.openPath(filePath);
  });

  /**
   * Handler for importing music from a URL.
   *
   * @param event The IPC event object for sending progress updates
   * @param url The URL of the music page to import from
   * @returns Promise<MusicPiece> The created music piece with all fields
   * @throws Error if import fails or database operation fails
   */
  ipcMain.handle("importMusic", async (event: IpcMainInvokeEvent, url: string): Promise<MusicPiece> => {
    // Progress callback to send updates to renderer
    const onProgress = (progress: DownloadProgress) => {
      event.sender.send("import-progress", progress);
    };

    // Import music by scraping, downloading assets, and creating database entry
    const musicPiece = await importMusic(url, onProgress);

    return musicPiece;
  });

  /**
   * Handler for importing a playlist from a URL.
   * Creates playlist, imports all music (skipping existing), and adds to junction table.
   *
   * @param url The URL of the playlist page to import from
   * @returns Promise<Playlist> The created playlist with all fields
   * @throws Error if import fails or database operation fails
   */
  ipcMain.handle("importPlaylist", async (_event, url: string): Promise<Playlist> => {
    // Import playlist by scraping, downloading assets, and creating database entries
    const playlist = await importPlaylist(url);

    return playlist;
  });
}
