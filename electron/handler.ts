import { ipcMain } from "electron";
import { databaseManager, MusicService } from "./db";
import { MusicPiece } from "../shared/model";

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
}
