import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

import { Database as SQLite3DB, Statement as SQLite3Statement } from "sqlite3";
import { Database, open } from "sqlite";

import { getStorageDir } from "./utils";
import {
  MusicPiece,
  MusicPieceSchema,
  Playlist,
  PlaylistSchema,
  PlaylistMusic,
  PlaylistWithMusic,
} from "../shared/model";

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3");

let db: Database<SQLite3DB, SQLite3Statement> | null = null;

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
  async initialize(): Promise<void> {
    // Ensure storage directory exists
    await fs.promises.mkdir(this.storageDir, { recursive: true });

    // Open database connection
    db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    // Create tables
    await this.createTables();
  }

  /**
   * Create database tables for music pieces only
   */
  private async createTables(): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    // Music pieces table with camelCase field names
    await db.exec(`
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
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_music_pieces_timestamp
        AFTER UPDATE ON music_pieces
        FOR EACH ROW
        BEGIN
          UPDATE music_pieces SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Playlists table with camelCase field names
    await db.exec(`
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
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_playlists_timestamp
        AFTER UPDATE ON playlists
        FOR EACH ROW
        BEGIN
          UPDATE playlists SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Junction table for many-to-many relationship between playlists and music pieces
    await db.exec(`
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
  getDatabase(): Database<SQLite3DB, SQLite3Statement> {
    if (!db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (db) {
      await db.close();
      db = null;
    }
  }
}

/**
 * Music piece CRUD operations
 */
export class MusicService {
  private db: Database<SQLite3DB, SQLite3Statement>;

  constructor(database: Database<SQLite3DB, SQLite3Statement>) {
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

    const result = await this.db.run(
      `
      INSERT INTO music_pieces (name, hash, srcLink, author, authorLink, duration, fileSize, playCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        validatedPiece.name,
        validatedPiece.hash,
        validatedPiece.srcLink,
        validatedPiece.author,
        validatedPiece.authorLink,
        validatedPiece.duration,
        validatedPiece.fileSize,
        validatedPiece.playCount,
      ],
    );

    if (!result.lastID) {
      throw new Error("Failed to create music piece");
    }

    return this.getMusicPieceById(result.lastID);
  }

  /**
   * Get music piece by ID
   */
  async getMusicPieceById(id: number): Promise<MusicPiece> {
    const row = await this.db.get("SELECT * FROM music_pieces WHERE id = ?", [id]);
    if (!row) {
      throw new Error(`Music piece with ID ${id} not found`);
    }
    return row;
  }

  /**
   * Get music piece by hash
   */
  async getMusicPieceByHash(hash: string): Promise<MusicPiece | null> {
    const row = await this.db.get("SELECT * FROM music_pieces WHERE hash = ?", [hash]);
    if (!row) {
      return null;
    }
    return row;
  }

  /**
   * Get all music pieces
   */
  async getAllMusicPieces(): Promise<MusicPiece[]> {
    const rows = await this.db.all(`SELECT * FROM music_pieces`);
    return rows;
  }
}

/**
 * Playlist CRUD operations
 */
export class PlaylistService {
  private db: Database<SQLite3DB, SQLite3Statement>;

  constructor(database: Database<SQLite3DB, SQLite3Statement>) {
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

    const result = await this.db.run(
      `
      INSERT INTO playlists (name, description, isPinned, songCount, totalDuration)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        validatedPlaylist.name,
        validatedPlaylist.description ?? null,
        validatedPlaylist.isPinned ? 1 : 0,
        validatedPlaylist.songCount,
        validatedPlaylist.totalDuration,
      ],
    );

    if (!result.lastID) {
      throw new Error("Failed to create playlist");
    }

    return this.getPlaylistById(result.lastID);
  }

  /**
   * Get playlist by ID
   *
   * @param id The playlist ID
   * @returns The playlist data
   * @throws Error if playlist not found
   */
  async getPlaylistById(id: number): Promise<Playlist> {
    const row = await this.db.get("SELECT * FROM playlists WHERE id = ?", [id]);
    if (!row) {
      throw new Error(`Playlist with ID ${id} not found`);
    }
    // Convert isPinned from integer to boolean
    return {
      ...row,
      isPinned: Boolean(row.isPinned),
    };
  }

  /**
   * Get all playlists
   *
   * @returns Array of all playlists
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    const rows = await this.db.all(`SELECT * FROM playlists`);
    // Convert isPinned from integer to boolean for each row
    return rows.map((row) => ({
      ...row,
      isPinned: Boolean(row.isPinned),
    }));
  }

  /**
   * Get playlist with associated music pieces
   *
   * @param id The playlist ID
   * @returns The playlist with all music pieces ordered by position
   * @throws Error if playlist not found
   */
  async getPlaylistWithMusic(id: number): Promise<PlaylistWithMusic> {
    const playlistRow = await this.db.get("SELECT * FROM playlists WHERE id = ?", [id]);

    if (!playlistRow) {
      throw new Error(`Playlist with ID ${id} not found`);
    }

    // Get all music pieces in this playlist
    const musicRows = await this.db.all(
      `
      SELECT
        pm.position,
        pm.addedAt,
        mp.*
      FROM playlist_music pm
      INNER JOIN music_pieces mp ON pm.musicId = mp.id
      WHERE pm.playlistId = ?
      ORDER BY pm.position ASC
    `,
      [id],
    );

    // Convert isPinned from integer to boolean
    const playlist = {
      ...playlistRow,
      isPinned: Boolean(playlistRow.isPinned),
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
    const musicPiece = await this.db.get("SELECT * FROM music_pieces WHERE id = ?", [musicId]);

    if (!musicPiece) {
      throw new Error(`Music piece with ID ${musicId} not found`);
    }

    // Determine the insertion position
    let insertPosition = position;
    if (insertPosition === undefined) {
      // If position not provided, append to the end
      const maxPositionRow = await this.db.get(
        "SELECT MAX(position) as maxPos FROM playlist_music WHERE playlistId = ?",
        [playlistId],
      );
      insertPosition = (maxPositionRow?.maxPos ?? -1) + 1;
    } else {
      // Shift existing items to make room for the new item
      await this.db.run(
        `
        UPDATE playlist_music
        SET position = position + 1
        WHERE playlistId = ? AND position >= ?
      `,
        [playlistId, insertPosition],
      );
    }

    // Insert into junction table
    const result = await this.db.run(
      `
      INSERT INTO playlist_music (playlistId, musicId, position)
      VALUES (?, ?, ?)
    `,
      [playlistId, musicId, insertPosition],
    );

    if (!result.lastID) {
      throw new Error("Failed to add music to playlist");
    }

    // Update playlist denormalized fields
    await this.db.run(
      `
      UPDATE playlists
      SET songCount = songCount + 1,
          totalDuration = totalDuration + ?
      WHERE id = ?
    `,
      [musicPiece.duration, playlistId],
    );

    // Get and return the junction record
    const row = await this.db.get("SELECT * FROM playlist_music WHERE id = ?", [result.lastID]);

    return {
      ...row,
      addedAt: new Date(row.addedAt),
    };
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
    const junctionRow = await this.db.get(
      `
      SELECT * FROM playlist_music
      WHERE playlistId = ? AND musicId = ?
    `,
      [playlistId, musicId],
    );

    if (!junctionRow) {
      throw new Error(`Music piece ${musicId} not found in playlist ${playlistId}`);
    }

    // Get music piece duration
    const musicPiece = await this.db.get("SELECT duration FROM music_pieces WHERE id = ?", [
      musicId,
    ]);

    if (!musicPiece) {
      throw new Error(`Music piece with ID ${musicId} not found`);
    }

    // Delete the junction record
    await this.db.run(
      `
      DELETE FROM playlist_music
      WHERE playlistId = ? AND musicId = ?
    `,
      [playlistId, musicId],
    );

    // Update playlist denormalized fields
    await this.db.run(
      `
      UPDATE playlists
      SET songCount = songCount - 1,
          totalDuration = totalDuration - ?
      WHERE id = ?
    `,
      [musicPiece.duration, playlistId],
    );

    // Reorder remaining items in the playlist
    await this.db.run(
      `
      UPDATE playlist_music
      SET position = position - 1
      WHERE playlistId = ? AND position > ?
    `,
      [playlistId, junctionRow.position],
    );
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();
