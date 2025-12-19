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
  /** Date and time when this track was last played */
  lastPlayed: z.coerce.date().optional(),
});

/**
 * Music piece data structure type
 * Represents a complete audio track entity with all metadata and playback statistics
 */
export type MusicPiece = z.infer<typeof MusicPieceSchema>;
