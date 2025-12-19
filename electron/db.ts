import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

import { Database as SQLite3DB, Statement as SQLite3Statement } from "sqlite3";
import { Database, open } from "sqlite";

import { getStorageDir } from "./utils";
import { MusicPiece, MusicPieceSchema } from "../shared/model";

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

// Export singleton instance
export const databaseManager = new DatabaseManager();
