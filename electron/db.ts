import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";

import { getStorageDir, getMusicDir } from "./utils";
import {
  MusicPiece,
  MusicPieceSchema,
  Playlist,
  PlaylistSchema,
  PlaylistMusic,
  PlaylistWithMusic,
} from "../shared/model";

let db: Database.Database | null = null;

/**
 * Database Manager for handling music piece database operations
 */
export class DatabaseManager {
  private dbPath: string;
  private storageDir: string;

  constructor() {
    this.storageDir = getStorageDir();
    this.dbPath = path.join(this.storageDir, "db.sqlite3");
  }

  /**
   * Initialize database connection and create tables
   */
  initialize(): void {
    // Ensure storage directory exists
    fs.mkdirSync(this.storageDir, { recursive: true });

    // Open database connection
    db = new Database(this.dbPath);

    // Create tables
    this.createTables();
  }

  /**
   * Create database tables for music pieces only
   */
  private createTables(): void {
    if (!db) throw new Error("Database not initialized");

    // Music pieces table with camelCase field names
    db.exec(`
      CREATE TABLE IF NOT EXISTS music_pieces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        name TEXT NOT NULL,
        hash TEXT UNIQUE NOT NULL,
        srcLink TEXT NOT NULL,
        author TEXT NOT NULL,
        authorLink TEXT NOT NULL,
        duration REAL NOT NULL,
        fileSize INTEGER NOT NULL,
        playCount INTEGER DEFAULT 0,
        lastPlayed DATETIME
      )
    `);

    // Create trigger for updating timestamps
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_music_pieces_timestamp
        AFTER UPDATE ON music_pieces
        FOR EACH ROW
        BEGIN
          UPDATE music_pieces SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Playlists table with camelCase field names
    db.exec(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        isPinned INTEGER DEFAULT 0,
        songCount INTEGER DEFAULT 0,
        totalDuration INTEGER DEFAULT 0
      )
    `);

    // Create trigger for updating playlists timestamps
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_playlists_timestamp
        AFTER UPDATE ON playlists
        FOR EACH ROW
        BEGIN
          UPDATE playlists SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Junction table for many-to-many relationship between playlists and music pieces
    db.exec(`
      CREATE TABLE IF NOT EXISTS playlist_music (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlistId INTEGER NOT NULL,
        musicId INTEGER NOT NULL,
        position INTEGER NOT NULL,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (musicId) REFERENCES music_pieces(id) ON DELETE CASCADE,
        UNIQUE(playlistId, position)
      )
    `);
  }

  /**
   * Get database instance
   */
  getDatabase(): Database.Database {
    if (!db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  }
}

/**
 * Music piece CRUD operations
 */
export class MusicService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  /**
   * Create a new music piece
   */
  createMusicPiece(piece: Omit<MusicPiece, "id" | "createdAt" | "updatedAt">): MusicPiece {
    // Validate input using Zod schema
    const validatedPiece = MusicPieceSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }).parse(piece);

    const stmt = this.db.prepare(
      `
      INSERT INTO music_pieces (name, hash, srcLink, author, authorLink, duration, fileSize, playCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    );

    const result = stmt.run(
      validatedPiece.name,
      validatedPiece.hash,
      validatedPiece.srcLink,
      validatedPiece.author,
      validatedPiece.authorLink,
      validatedPiece.duration,
      validatedPiece.fileSize,
      validatedPiece.playCount,
    );

    const lastId =
      typeof result.lastInsertRowid === "bigint"
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    if (!lastId) {
      throw new Error("Failed to create music piece");
    }

    return this.getMusicPieceById(lastId);
  }

  /**
   * Get music piece by ID
   */
  getMusicPieceById(id: number): MusicPiece {
    const stmt = this.db.prepare("SELECT * FROM music_pieces WHERE id = ?");
    const row = stmt.get(id);
    if (!row) {
      throw new Error(`Music piece with ID ${id} not found`);
    }
    return MusicPieceSchema.parse(row);
  }

  /**
   * Get music piece by hash
   */
  getMusicPieceByHash(hash: string): MusicPiece | null {
    const stmt = this.db.prepare("SELECT * FROM music_pieces WHERE hash = ?");
    const row = stmt.get(hash);
    if (!row) {
      return null;
    }
    return MusicPieceSchema.parse(row);
  }

  /**
   * Get all music pieces
   */
  getAllMusicPieces(): MusicPiece[] {
    const stmt = this.db.prepare("SELECT * FROM music_pieces");
    const rows = stmt.all();
    return MusicPieceSchema.array().parse(rows);
  }

  /**
   * Update the last played timestamp and increment play count for a music piece.
   *
   * @param hash Unique identifier of the music piece
   * @throws Error if music piece not found or update fails
   */
  updateLastPlayed(hash: string): void {
    const stmt = this.db.prepare(
      `UPDATE music_pieces SET lastPlayed = CURRENT_TIMESTAMP, playCount = playCount + 1 WHERE hash = ?`,
    );
    const result = stmt.run(hash);
    if (result.changes === 0) {
      throw new Error(`Music piece with hash ${hash} not found`);
    }
  }

  /**
   * Delete a music piece from the database and all associated playlist junctions
   *
   * @param musicId The music piece ID to delete
   * @throws Error if music piece not found
   */
  deleteMusicPiece(musicId: number): void {
    if (!db) throw new Error("Database not initialized");

    // Get music piece to update playlists and retrieve hash for file deletion
    const musicStmt = db.prepare("SELECT * FROM music_pieces WHERE id = ?");
    const musicPiece = musicStmt.get(musicId) as MusicPiece | undefined;

    if (!musicPiece) {
      throw new Error(`Music piece with ID ${musicId} not found`);
    }

    // Get all playlists that contain this music piece
    const junctionStmt = db.prepare(
      `
      SELECT playlistId FROM playlist_music WHERE musicId = ?
    `,
    );
    const junctionRows = junctionStmt.all(musicId) as { playlistId: number }[];

    // Delete all junction records for this music piece
    const deleteJunctionStmt = db.prepare(
      `
      DELETE FROM playlist_music WHERE musicId = ?
    `,
    );
    deleteJunctionStmt.run(musicId);

    // Update all affected playlists' denormalized fields
    if (junctionRows.length > 0) {
      const updatePlaylistStmt = db.prepare(
        `
        UPDATE playlists
        SET songCount = songCount - 1,
            totalDuration = totalDuration - ?
        WHERE id = ?
      `,
      );

      for (const row of junctionRows) {
        updatePlaylistStmt.run(musicPiece.duration, row.playlistId);
      }
    }

    // Delete the music piece from the database
    const deleteMusicStmt = db.prepare(
      `
      DELETE FROM music_pieces WHERE id = ?
    `,
    );
    deleteMusicStmt.run(musicId);

    // Delete the actual audio directory using hash
    const musicDir = getMusicDir(musicPiece.hash);
    fs.promises.rm(musicDir, { recursive: true, force: true }).catch((err) => {
      // Log error but don't throw - database record is already deleted
      console.error(`Failed to delete music directory ${musicDir}:`, err);
    });
  }
}

/**
 * Playlist CRUD operations
 */
export class PlaylistService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  /**
   * Create a new playlist
   *
   * @param playlist The playlist data without id, createdAt, updatedAt
   * @returns The created playlist with all fields
   * @throws Error if creation fails
   */
  createPlaylist(playlist: Omit<Playlist, "id" | "createdAt" | "updatedAt">): Playlist {
    // Validate input using Zod schema
    const validatedPlaylist = PlaylistSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }).parse(playlist);

    const stmt = this.db.prepare(
      `
      INSERT INTO playlists (name, description, isPinned, songCount, totalDuration)
      VALUES (?, ?, ?, ?, ?)
    `,
    );

    const result = stmt.run(
      validatedPlaylist.name,
      validatedPlaylist.description ?? null,
      validatedPlaylist.isPinned ? 1 : 0,
      validatedPlaylist.songCount,
      validatedPlaylist.totalDuration,
    );

    const lastId =
      typeof result.lastInsertRowid === "bigint"
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    if (!lastId) {
      throw new Error("Failed to create playlist");
    }

    return this.getPlaylistById(lastId);
  }

  /**
   * Get playlist by ID
   *
   * @param id The playlist ID
   * @returns The playlist data
   * @throws Error if playlist not found
   */
  getPlaylistById(id: number): Playlist {
    const stmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const row = stmt.get(id);
    if (!row) {
      throw new Error(`Playlist with ID ${id} not found`);
    }
    return PlaylistSchema.parse(row);
  }

  /**
   * Get all playlists
   *
   * @returns Array of all playlists
   */
  getAllPlaylists(): Playlist[] {
    const stmt = this.db.prepare("SELECT * FROM playlists");
    const rows = stmt.all();
    return PlaylistSchema.array().parse(rows);
  }

  /**
   * Get playlist by name
   *
   * @param name The playlist name
   * @returns The playlist data
   * @throws Error if playlist not found
   */
  getPlaylistByName(name: string): Playlist {
    const stmt = this.db.prepare("SELECT * FROM playlists WHERE name = ?");
    const row = stmt.get(name);
    if (!row) {
      throw new Error(`Playlist with name "${name}" not found`);
    }
    return PlaylistSchema.parse(row);
  }

  /**
   * Get playlist with associated music pieces
   *
   * @param id The playlist ID
   * @returns The playlist with all music pieces ordered by position
   * @throws Error if playlist not found
   */
  getPlaylistWithMusic(id: number): PlaylistWithMusic {
    const playlistStmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const playlistRow = playlistStmt.get(id);

    if (!playlistRow) {
      throw new Error(`Playlist with ID ${id} not found`);
    }

    // Parse playlist using Zod
    const playlist = PlaylistSchema.parse(playlistRow);

    // Get all music pieces in this playlist
    const musicStmt = this.db.prepare(`
      SELECT
        pm.position,
        pm.addedAt,
        mp.*
      FROM playlist_music pm
      INNER JOIN music_pieces mp ON pm.musicId = mp.id
      WHERE pm.playlistId = ?
      ORDER BY pm.position ASC
    `);

    const musicRows = musicStmt.all(id);

    // Map music pieces using Zod parsing
    const musicPieces = musicRows.map((row) => ({
      music: MusicPieceSchema.parse(row),
      position: (row as { position: number }).position,
      addedAt: new Date((row as { addedAt: string }).addedAt),
    }));

    return {
      ...playlist,
      musicPieces,
    };
  }

  /**
   * Insert a music piece to a playlist at a specific position
   *
   * @param playlistId The playlist ID
   * @param musicId The music piece ID
   * @param position Optional position in the playlist. If not provided, appends to the end
   * @returns The created junction record
   * @throws Error if operation fails
   */
  insertMusicToPlaylist(playlistId: number, musicId: number, position?: number): PlaylistMusic {
    // Get music piece to calculate duration
    const musicStmt = this.db.prepare("SELECT * FROM music_pieces WHERE id = ?");
    const musicPiece = musicStmt.get(musicId) as { duration: number } | undefined;

    if (!musicPiece) {
      throw new Error(`Music piece with ID ${musicId} not found`);
    }

    // Determine the insertion position
    let insertPosition = position;
    if (insertPosition === undefined) {
      // If position not provided, append to the end
      const maxPosStmt = this.db.prepare(
        "SELECT MAX(position) as maxPos FROM playlist_music WHERE playlistId = ?",
      );
      const maxPositionRow = maxPosStmt.get(playlistId) as { maxPos: number | null } | undefined;
      insertPosition = (maxPositionRow?.maxPos ?? -1) + 1;
    } else {
      // Shift existing items to make room for the new item
      const shiftStmt = this.db.prepare(
        `
        UPDATE playlist_music
        SET position = position + 1
        WHERE playlistId = ? AND position >= ?
      `,
      );
      shiftStmt.run(playlistId, insertPosition);
    }

    // Insert into junction table
    const insertStmt = this.db.prepare(
      `
      INSERT INTO playlist_music (playlistId, musicId, position)
      VALUES (?, ?, ?)
    `,
    );

    const result = insertStmt.run(playlistId, musicId, insertPosition);

    const lastId =
      typeof result.lastInsertRowid === "bigint"
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
    if (!lastId) {
      throw new Error("Failed to add music to playlist");
    }

    // Update playlist denormalized fields
    const updateStmt = this.db.prepare(
      `
      UPDATE playlists
      SET songCount = songCount + 1,
          totalDuration = totalDuration + ?
      WHERE id = ?
    `,
    );
    updateStmt.run(musicPiece.duration, playlistId);

    // Get and return the junction record
    const junctionStmt = this.db.prepare("SELECT * FROM playlist_music WHERE id = ?");
    const row = junctionStmt.get(lastId) as PlaylistMusic | undefined;

    if (!row) {
      throw new Error("Failed to retrieve created junction record");
    }

    return row;
  }

  /**
   * Remove a music piece from a playlist
   *
   * @param playlistId The playlist ID
   * @param musicId The music piece ID
   * @throws Error if playlist or music not found
   */
  removeMusicFromPlaylist(playlistId: number, musicId: number): void {
    // Get the junction record to update denormalized fields
    const junctionStmt = this.db.prepare(
      `
      SELECT * FROM playlist_music
      WHERE playlistId = ? AND musicId = ?
    `,
    );
    const junctionRow = junctionStmt.get(playlistId, musicId) as PlaylistMusic | undefined;

    if (!junctionRow) {
      throw new Error(`Music piece ${musicId} not found in playlist ${playlistId}`);
    }

    // Get music piece duration
    const musicStmt = this.db.prepare("SELECT duration FROM music_pieces WHERE id = ?");
    const musicPiece = musicStmt.get(musicId) as { duration: number } | undefined;

    if (!musicPiece) {
      throw new Error(`Music piece with ID ${musicId} not found`);
    }

    // Delete the junction record
    const deleteStmt = this.db.prepare(
      `
      DELETE FROM playlist_music
      WHERE playlistId = ? AND musicId = ?
    `,
    );
    deleteStmt.run(playlistId, musicId);

    // Update playlist denormalized fields
    const updateStmt = this.db.prepare(
      `
      UPDATE playlists
      SET songCount = songCount - 1,
          totalDuration = totalDuration - ?
      WHERE id = ?
    `,
    );
    updateStmt.run(musicPiece.duration, playlistId);

    // Reorder remaining items in the playlist
    const reorderStmt = this.db.prepare(
      `
      UPDATE playlist_music
      SET position = position - 1
      WHERE playlistId = ? AND position > ?
    `,
    );
    reorderStmt.run(playlistId, junctionRow.position);
  }

  /**
   * Update a playlist's name and/or description
   *
   * @param playlistId The playlist ID to update
   * @param updates Object containing fields to update (name, description)
   * @returns The updated playlist
   * @throws Error if playlist not found or validation fails
   */
  updatePlaylist(
    playlistId: number,
    updates: Partial<Pick<Playlist, "name" | "description">>,
  ): Playlist {
    // Build the update query dynamically based on provided fields
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    const stmt = this.db.prepare(
      `UPDATE playlists SET ${fields.join(", ")} WHERE id = ?`,
    );

    const result = stmt.run(...values, playlistId);

    if (result.changes === 0) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }

    return this.getPlaylistById(playlistId);
  }

  /**
   * Delete a playlist from the database
   *
   * @param playlistId The playlist ID to delete
   * @throws Error if playlist not found
   */
  deletePlaylist(playlistId: number): void {
    // Get playlist to verify existence
    const stmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const playlist = stmt.get(playlistId) as Playlist | undefined;

    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }

    // Delete all junction records first (CASCADE will handle this, but explicit is clearer)
    const deleteJunctionStmt = this.db.prepare(
      "DELETE FROM playlist_music WHERE playlistId = ?",
    );
    deleteJunctionStmt.run(playlistId);

    // Delete the playlist
    const deleteStmt = this.db.prepare("DELETE FROM playlists WHERE id = ?");
    deleteStmt.run(playlistId);
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();
