import { z } from "zod";

/**
 * Base schema for all database entities
 * Provides common fields for timestamp tracking and unique identification
 */
export const BaseEntitySchema = z.object({
  /** Unique identifier for the entity */
  id: z.number(),
  /** Date and time when the entity was created */
  createdAt: z.coerce.date(),
  /** Date and time when the entity was last updated */
  updatedAt: z.coerce.date(),
});

/** Type inferred from BaseEntitySchema */
export type BasicEntity = z.infer<typeof BaseEntitySchema>;

/**
 * Music piece data structure schema
 * Extends BaseEntitySchema with music-specific fields for comprehensive audio track management
 */
export const MusicPieceSchema = BaseEntitySchema.extend({
  /** Name/title of the music piece */
  name: z.string().min(1),
  /** SHA1 hash used for file organization and deduplication */
  hash: z.hash("sha1"),
  /** Source URL where the music was originally downloaded from */
  srcLink: z.url(),
  /** Name of the music author/artist */
  author: z.string().min(1),
  /** URL to the author's profile or page */
  authorLink: z.url(),
  /** Duration of the audio track in seconds */
  duration: z.number().min(0), // in seconds
  /** Size of the audio file in bytes */
  fileSize: z.number().min(0), // in bytes
  /** Number of times this track has been played */
  playCount: z.number().min(0),
  /** Date and time when this track was last played (nullable in SQLite) */
  lastPlayed: z.coerce.date().nullable(),
});

/**
 * Music piece data structure type
 * Represents a complete audio track entity with all metadata and playback statistics
 */
export type MusicPiece = z.infer<typeof MusicPieceSchema>;

/**
 * Playlist data structure schema
 * Represents a complete playlist entity with metadata
 * Music pieces are managed through a junction table
 */
export const PlaylistSchema = BaseEntitySchema.extend({
  /** Name/title of the playlist */
  name: z.string().min(1),
  /** Description of the playlist */
  description: z.string().min(1).nullable(),
  /** Whether the playlist is pinned by the user (0/1 integer in SQLite, converted to boolean) */
  isPinned: z.preprocess((val) => Boolean(val), z.boolean().default(false)),
  /** Total number of songs in the playlist (denormalized for performance) */
  songCount: z.number().min(0).default(0),
  /** Total duration of all songs in seconds (denormalized for performance) */
  totalDuration: z.number().min(0).default(0),
});

/**
 * Playlist data structure type
 * Represents a complete playlist entity with all metadata
 */
export type Playlist = z.infer<typeof PlaylistSchema>;

/**
 * Junction table schema for many-to-many relationship between playlists and music pieces
 * This table tracks which songs are in which playlists and their order
 */
export const PlaylistMusicSchema = z.object({
  /** Unique identifier for the junction record */
  id: z.number(),
  /** ID of the playlist */
  playlistId: z.number(),
  /** ID of the music piece */
  musicId: z.number(),
  /** Position of the music piece within the playlist */
  position: z.number().min(0),
  /** Date and time when the music was added to this playlist */
  addedAt: z.coerce.date(),
});

/**
 * Junction table type for playlist-music relationships
 */
export type PlaylistMusic = z.infer<typeof PlaylistMusicSchema>;

/**
 * Playlist with associated music pieces
 * Used when fetching playlists with their songs
 */
export const PlaylistWithMusicSchema = PlaylistSchema.extend({
  /** Music pieces in this playlist, ordered by position */
  musicPieces: z.array(
    z.object({
      /** Music piece data */
      music: MusicPieceSchema,
      /** Position in playlist */
      position: z.number(),
      /** When added to playlist */
      addedAt: z.date(),
    }),
  ),
});

/**
 * Playlist with music pieces type
 */
export type PlaylistWithMusic = z.infer<typeof PlaylistWithMusicSchema>;
