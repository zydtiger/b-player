import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { app } from "electron";
import { YtDlp } from "ytdlp-nodejs";

const require = createRequire(import.meta.url);
const ffprobe = require("@ffprobe-installer/ffprobe");

/**
 * Gets the base storage path for music files in the app's userData directory
 * @returns Absolute path to the music storage directory
 */
export function getStoragePath(): string {
  return path.join(app.getPath("userData"), "music_storage");
}

/**
 * Gets the full path to a music directory for a specific hash
 * @param hash Unique identifier used as directory name for organizing files
 * @returns Absolute path to the hash-based music directory
 */
export function getMusicPath(hash: string): string {
  return path.join(getStoragePath(), hash);
}

/**
 * Utility functions for handling media downloads and analysis
 * Supports thumbnail images and audio files with metadata extraction
 */

/**
 * Downloads a thumbnail image from a given URL to a hash-based directory.
 * The file is saved as "thumbnail" with the extension derived from the URL
 * in a directory named after the provided hash for organized storage.
 *
 * @param url The URL of the thumbnail image to download.
 * @param hash Unique identifier used as directory name for organizing files.
 * @throws Error if the HTTP request fails or the response body is empty.
 */
export async function downloadThumbnail(url: string, hash: string): Promise<void> {
  // Fetch the thumbnail image from the provided URL
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Construct hash-based directory path in storage and create if necessary
  const destDir = getMusicPath(hash);
  await fs.promises.mkdir(destDir, { recursive: true });

  // Extract file extension from URL and construct output path
  const ext = path.extname(url);
  const outputPath = path.join(destDir, "thumbnail" + ext);
  const fileStream = fs.createWriteStream(outputPath);

  return new Promise<void>((resolve, reject) => {
    // Validate response body exists
    if (!res.body) {
      reject(new Error("Response body is null"));
      return;
    }

    // Convert web stream to Node.js stream and pipe to file
    const webStream = res.body as ReadableStream;
    Readable.fromWeb(webStream).pipe(fileStream);

    // Handle stream completion and errors
    fileStream.on("finish", () => resolve());
    fileStream.on("error", (err) => reject(err));
  });
}

/**
 * Downloads audio from a video URL using yt-dlp to a hash-based directory.
 * Extracts the best quality audio track and saves it as 'audio' with original extension
 * in a directory named after the provided hash for organized storage.
 *
 * @param url The video/audio URL to download from (YouTube, etc.).
 * @param hash Unique identifier used as directory name for organizing files.
 * @throws Error if the download process fails or yt-dlp encounters an error.
 */
export async function downloadAudio(url: string, hash: string): Promise<void> {
  // Initialize yt-dlp instance for audio downloading
  const ytDlp = new YtDlp();

  // Construct hash-based directory path in storage and create if necessary
  const destDir = getMusicPath(hash);
  await fs.promises.mkdir(destDir, { recursive: true });

  return new Promise<void>((resolve, reject) => {
    // Start download process with best audio quality to hash-based directory
    const process = ytDlp.download(url, {
      format: "bestaudio",
      output: path.join(destDir, "audio.%(ext)s"),
    });

    // Handle process completion - code 0 indicates success
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Download failed with code ${code}`));
      }
    });

    // Handle process errors during download
    process.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Interface representing audio file metadata
 */
interface AudioResult {
  /** Duration of the audio file in seconds */
  duration: number;
  /** Size of the audio file in bytes */
  fileSize: number;
}

/**
 * Retrieves metadata for an audio file including duration and file size from a hash-based directory.
 * Uses ffprobe to extract audio duration from the file located in the hash directory.
 *
 * @param hash Unique identifier used as directory name where audio files are stored.
 * @returns Promise<AudioResult> Object containing duration (seconds) and file size (bytes)
 * @throws Error if no audio file is found in the hash directory or ffprobe fails to analyze the file
 */
export async function getAudioStats(hash: string): Promise<AudioResult> {
  // Construct hash-based directory path and list files
  const musicDir = getMusicPath(hash);
  const files = await fs.promises.readdir(musicDir);
  const file = files.find((f) => f.startsWith("audio"));

  // Validate that audio file exists in hash directory
  if (!file) {
    throw new Error("No audio file found");
  }

  // Construct full path to audio file and get file stats
  const audioPath = path.join(musicDir, file);
  const stats = await fs.promises.stat(audioPath);

  // Extract duration using ffprobe
  const duration = await new Promise<number>((resolve, reject) => {
    // Spawn ffprobe process to get audio duration from hash-based file
    const child = spawn(ffprobe.path, [
      "-v",
      "error", // Suppress verbose output
      "-show_entries",
      "format=duration", // Extract duration from format metadata
      "-of",
      "default=noprint_wrappers=1:nokey=1", // Clean output format
      audioPath,
    ]);

    let stdout = "";
    let stderr = "";

    // Collect stdout data (contains duration)
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    // Collect stderr data (contains error messages)
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Handle process spawn errors
    child.on("error", (err) => {
      reject(err);
    });

    // Handle process completion
    child.on("close", (code) => {
      // Check if ffprobe exited successfully
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
      }

      // Parse duration value and validate it's a finite number
      const value = parseFloat(stdout.trim());
      resolve(Number.isFinite(value) ? value : 0);
    });
  });

  // Return combined audio metadata from hash-based storage
  return {
    duration: duration,
    fileSize: stats.size,
  };
}
