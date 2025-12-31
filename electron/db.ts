import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";

import { getStorageDir } from "./utils";
import {
  MusicPiece,
  MusicPieceSchema,
  Playlist,
  PlaylistSchema,
  PlaylistMusic,
  PlaylistWithMusic,
} from "../shared/model";

/**
 * Database row type for playlists (isPinned is stored as number in SQLite)
 */
type PlaylistRow = Omit<Playlist, "isPinned"> & { isPinned: number };

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
  async createMusicPiece(
    piece: Omit<MusicPiece, "id" | "createdAt" | "updatedAt">,
  ): Promise<MusicPiece> {
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
  async getMusicPieceById(id: number): Promise<MusicPiece> {
    const stmt = this.db.prepare("SELECT * FROM music_pieces WHERE id = ?");
    const row = stmt.get(id) as MusicPiece | undefined;
    if (!row) {
      throw new Error(`Music piece with ID ${id} not found`);
    }
    return row;
  }

  /**
   * Get music piece by hash
   */
  async getMusicPieceByHash(hash: string): Promise<MusicPiece | null> {
    const stmt = this.db.prepare("SELECT * FROM music_pieces WHERE hash = ?");
    const row = stmt.get(hash) as MusicPiece | undefined;
    if (!row) {
      return null;
    }
    return row;
  }

  /**
   * Get all music pieces
   */
  async getAllMusicPieces(): Promise<MusicPiece[]> {
    const stmt = this.db.prepare("SELECT * FROM music_pieces");
    const rows = stmt.all() as MusicPiece[];
    return rows;
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
  async createPlaylist(
    playlist: Omit<Playlist, "id" | "createdAt" | "updatedAt">,
  ): Promise<Playlist> {
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
  async getPlaylistById(id: number): Promise<Playlist> {
    const stmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const row = stmt.get(id) as PlaylistRow | undefined;
    if (!row) {
      throw new Error(`Playlist with ID ${id} not found`);
    }
    // Convert isPinned from integer to boolean
    return {
      id: row.id,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      name: row.name,
      description: row.description ?? undefined,
      isPinned: Boolean(row.isPinned),
      songCount: row.songCount,
      totalDuration: row.totalDuration,
    };
  }

  /**
   * Get all playlists
   *
   * @returns Array of all playlists
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    const stmt = this.db.prepare("SELECT * FROM playlists");
    const rows = stmt.all() as PlaylistRow[];
    // Convert isPinned from integer to boolean for each row
    return rows.map(
      (row): Playlist => ({
        id: row.id,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        name: row.name,
        description: row.description ?? undefined,
        isPinned: Boolean(row.isPinned),
        songCount: row.songCount,
        totalDuration: row.totalDuration,
      }),
    );
  }

  /**
   * Get playlist with associated music pieces
   *
   * @param id The playlist ID
   * @returns The playlist with all music pieces ordered by position
   * @throws Error if playlist not found
   */
  async getPlaylistWithMusic(id: number): Promise<PlaylistWithMusic> {
    const playlistStmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const playlistRow = playlistStmt.get(id) as PlaylistRow | undefined;

    if (!playlistRow) {
      throw new Error(`Playlist with ID ${id} not found`);
    }

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

    const musicRows = musicStmt.all(id) as (MusicPiece & { position: number; addedAt: string })[];

    // Convert database row to Playlist type
    const playlist: Playlist = {
      id: playlistRow.id,
      createdAt: new Date(playlistRow.createdAt),
      updatedAt: new Date(playlistRow.updatedAt),
      name: playlistRow.name,
      description: playlistRow.description ?? undefined,
      isPinned: Boolean(playlistRow.isPinned),
      songCount: playlistRow.songCount,
      totalDuration: playlistRow.totalDuration,
    };

    // Map music pieces to the expected format
    const musicPieces = musicRows.map((row) => ({
      music: {
        id: row.id,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        name: row.name,
        hash: row.hash,
        srcLink: row.srcLink,
        author: row.author,
        authorLink: row.authorLink,
        duration: row.duration,
        fileSize: row.fileSize,
        playCount: row.playCount,
        lastPlayed: row.lastPlayed ? new Date(row.lastPlayed) : undefined,
      },
      position: row.position,
      addedAt: new Date(row.addedAt),
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
  async insertMusicToPlaylist(
    playlistId: number,
    musicId: number,
    position?: number,
  ): Promise<PlaylistMusic> {
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
  async removeMusicFromPlaylist(playlistId: number, musicId: number): Promise<void> {
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
}

// Export singleton instance
export const databaseManager = new DatabaseManager();
