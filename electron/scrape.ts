import crypto from "node:crypto";
import { BrowserWindow } from "electron";

import { downloadAudio, downloadThumbnail, getAudioStats, DownloadProgress } from "./utils";
import { databaseManager, MusicService, PlaylistService } from "./db";
import { MusicPiece, Playlist } from "../shared/model";

/**
 * Interface representing the scraped music information from the webpage
 * Contains all the metadata extracted from the video page
 */
interface MusicPieceResult {
  /** Title of the music/video */
  name: string;
  /** URL to the thumbnail image */
  imgSrc: string;
  /** Direct link to the audio/video source */
  srcLink: string;
  /** Name of the content creator/uploader */
  author: string;
  /** Link to the creator's profile page */
  authorLink: string;
}

/**
 * Interface representing scraped playlist information
 */
interface PlaylistResult {
  /** Title of the playlist */
  title: string;
  /** Array of music pieces in the playlist */
  musicPieces: MusicPieceResult[];
}

/**
 * Imports music from URL by scraping webpage metadata and downloading audio.
 *
 * @param url The URL of the music page to scrape
 * @param onProgress Optional callback for import progress updates
 * @returns Promise<MusicPiece> The created music piece with all database fields
 * @throws Error if scraping fails, elements not found, downloads fail, or database operation fails
 */
export async function importMusic(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<MusicPiece> {
  return new Promise((resolve, reject) => {
    // Create hidden browser window for scraping
    const scraper = new BrowserWindow({ show: true });

    // Mute audio to prevent any sound during scraping
    scraper.webContents.setAudioMuted(true);

    // Load target URL
    scraper.loadURL(url.toString());

    // Wait for DOM to load before scraping
    scraper.webContents.on("dom-ready", async () => {
      try {
        onProgress?.({ stage: "scraping", progress: 0, message: "Loading page..." });

        // Extract music metadata waiting for required elements
        const musicPartialResult = await waitForLogic<Omit<MusicPieceResult, "srcLink">>(
          scraper,
          // Self-executing function in browser context
          `(() => {
            // Select key elements
            const nameElem = document.querySelector("div.video-info-title");
            const imgElem = document.querySelector("img#wxwork-share-pic");

            if (!nameElem || !imgElem) return null;

            const name = nameElem.innerText;
            let imgSrc = imgElem.getAttribute("src");

            // Ensure thumbnail URL is absolute
            if (!imgSrc.startsWith("http")) imgSrc = "https:" + imgSrc;

            // Skip default placeholder thumbnail
            if (imgSrc === "https://i0.hdslb.com/bfs/static/jinkela/long/images/512.png") {
              return null;
            }

            // Try uploader element first, fall back to member/staff element
            let author;
            let authorLink;

            const upElem = document.querySelector("a.up-name");
            if (upElem) {
              author = upElem.innerText.split(" ")[0];
              authorLink = upElem.getAttribute("href");
            } else {
              // Handle member/staff case
              const firstMemberElem = document.querySelector("a.staff-name");
              if (!firstMemberElem) return null;

              author = firstMemberElem.innerText;
              authorLink = firstMemberElem.getAttribute("href");
            }

            // Ensure author link URL is absolute
            if (!authorLink.startsWith("http")) authorLink = "https:" + authorLink;

            return {
              name,
              imgSrc,
              author,
              authorLink,
            };
          })()`,
          10000, // 10 second timeout
        );

        // Add source URL to complete music result
        const musicResult = { ...musicPartialResult, srcLink: url };

        // Generate unique hash for file naming
        const hash = crypto.createHash("sha1").update(musicResult.srcLink, "utf-8").digest("hex");

        // Download assets
        onProgress?.({ stage: "thumbnail", progress: 3, message: "Downloading thumbnail..." });
        await downloadThumbnail(musicResult.imgSrc, hash);
        await downloadAudio(musicResult.srcLink, hash, onProgress);

        onProgress?.({ stage: "metadata", progress: 96, message: "Saving to database..." });

        // Get audio statistics
        const audioStats = await getAudioStats(hash);

        // Create music service instance with database connection
        const musicService = new MusicService(databaseManager.getDatabase());

        // Save music piece to database and return the complete MusicPiece
        const musicPiece = musicService.createMusicPiece({
          name: musicResult.name,
          hash,
          srcLink: musicResult.srcLink,
          author: musicResult.author,
          authorLink: musicResult.authorLink,
          duration: audioStats.duration,
          fileSize: audioStats.fileSize,
          playCount: 0,
          lastPlayed: null,
        });

        onProgress?.({ stage: "metadata", progress: 100, message: "Complete!" });

        // Clean up browser window
        scraper.close();

        resolve(musicPiece);
      } catch (error) {
        console.error("Error executing JavaScript:", error);

        // Ensure browser window is closed on error
        scraper.close();

        reject(error);
      }
    });
  });
}

/**
 * Waits for logic to return non-null value.
 *
 * @param window BrowserWindow instance
 * @param frontend_js JavaScript code to execute in browser context
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise<T> The result of the logic
 */
async function waitForLogic<T>(
  window: BrowserWindow,
  frontend_js: string,
  timeout: number = 5000,
): Promise<T> {
  const startTime = Date.now();
  const pollInterval = 100;

  return new Promise((resolve, reject) => {
    const checkLogic = async () => {
      try {
        // Execute JavaScript in browser context
        const result = await window.webContents.executeJavaScript(frontend_js);

        // Check if condition is satisfied
        if (result !== null && result !== undefined) {
          resolve(result as T);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Logic not satisfied within ${timeout}ms`));
          return;
        }

        // Schedule next check
        setTimeout(checkLogic, pollInterval);
      } catch (error) {
        reject(new Error(`Error checking logic: ${error}`));
      }
    };

    // Start polling
    checkLogic();
  });
}

/**
 * Imports a playlist from URL by scraping playlist metadata and all associated music.
 * Creates playlist in database, imports music pieces (skipping already downloaded),
 * and adds them to the junction table.
 *
 * @param url The URL of the playlist page to scrape
 * @param onProgress Optional callback for import progress updates
 * @returns Promise<Playlist> The created playlist with all fields
 * @throws Error if scraping fails or playlist creation fails
 */
export async function importPlaylist(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<Playlist> {
  return new Promise((resolve, reject) => {
    // Create hidden browser window for scraping
    const scraper = new BrowserWindow({ show: false });

    // Mute audio to prevent any sound during scraping
    scraper.webContents.setAudioMuted(true);

    // Load target URL
    scraper.loadURL(url.toString());

    // Wait for DOM to load before scraping
    scraper.webContents.on("dom-ready", async () => {
      try {
        onProgress?.({ stage: "scraping", progress: 0, message: "Loading playlist page..." });

        // Extract playlist metadata waiting for required elements
        const playlistResult = await waitForLogic<PlaylistResult>(
          scraper,
          // Self-executing function in browser context
          `(() => {
            const result = {
              title: "",
              musicPieces: [],
            };

            const titleElem = document.querySelector("div.favlist-info-detail__title");
            if (!titleElem) return null;
            result["title"] = titleElem.innerText.trim().split("\\n")[0];

            const musicElems = document.querySelectorAll("div.items > div.items__item");
            if (musicElems.length === 0) return null;

            for (const elem of musicElems) {
              const imgElem = elem.querySelector("div.bili-cover-card__thumbnail > img");
              const nameElem = elem.querySelector("div.bili-video-card__title > a");
              const authorElem = elem.querySelector("a.bili-video-card__author");
              if (!imgElem || !nameElem || !authorElem) return null;

              const imgSrc = "https:" + imgElem.getAttribute("src");
              const name = nameElem.innerText.trim();
              const srcLink = nameElem.getAttribute("href");

              const author = authorElem.innerText.trim().split(" ")[0];
              const authorLink = authorElem.getAttribute("href");

              result["musicPieces"].push({
                name,
                imgSrc,
                srcLink,
                author,
                authorLink,
              });
            }

            return result;
          })()`,
          15000, // 15 second timeout for playlist pages
        );

        const totalMusic = playlistResult.musicPieces.length;
        const progressPerMusic = 95 / totalMusic; // 5% for scraping, 95% for downloads

        onProgress?.({ stage: "scraping", progress: 5, message: `Found ${totalMusic} songs` });

        // Initialize services
        const playlistService = new PlaylistService(databaseManager.getDatabase());
        const musicService = new MusicService(databaseManager.getDatabase());

        // Create playlist in database
        const newPlaylist = playlistService.createPlaylist({
          name: playlistResult.title,
          description: null,
          isPinned: true,
          songCount: totalMusic,
          totalDuration: 0, // Will be updated as music is added
        });

        // Process music in batches of 8 for parallel downloading
        const CONCURRENCY = 8;
        for (let batchStart = 0; batchStart < totalMusic; batchStart += CONCURRENCY) {
          const batchEnd = Math.min(batchStart + CONCURRENCY, totalMusic);
          const batch = playlistResult.musicPieces.slice(batchStart, batchEnd);

          onProgress?.({
            stage: "audio",
            progress: Math.floor(5 + batchStart * progressPerMusic),
            message: `Downloading audio ${batchStart + 1} to ${batchEnd} / ${totalMusic}`,
          });

          // Phase 1: Download all music in this batch in parallel
          const downloadResults = await Promise.all(
            batch.map(async (musicData, batchIndex) => {
              const globalIndex = batchStart + batchIndex;
              const hash = crypto
                .createHash("sha1")
                .update(musicData.srcLink, "utf-8")
                .digest("hex");

              // Check if music already exists
              const existingMusic = musicService.getMusicPieceByHash(hash);
              let musicId: number;

              if (existingMusic) {
                // Skip download, use existing music
                console.log(`Skipping download for existing music: ${musicData.name}`);
                musicId = existingMusic.id;
              } else {
                // Download thumbnail and audio in parallel
                await Promise.all([
                  downloadThumbnail(musicData.imgSrc, hash),
                  downloadAudio(musicData.srcLink, hash), // No onProgress callback for cleaner UI
                ]);

                // Get audio statistics after both downloads complete
                const audioStats = await getAudioStats(hash);

                // Create music piece in database
                const createdMusic = musicService.createMusicPiece({
                  name: musicData.name,
                  hash,
                  srcLink: musicData.srcLink,
                  author: musicData.author,
                  authorLink: musicData.authorLink,
                  duration: audioStats.duration,
                  fileSize: audioStats.fileSize,
                  playCount: 0,
                  lastPlayed: null,
                });

                musicId = createdMusic.id;
              }

              // Return result with globalIndex for ordering
              return { musicId, globalIndex };
            }),
          );

          // Phase 2: Insert into playlist sequentially in globalIndex order
          const sortedResults = downloadResults.sort((a, b) => a.globalIndex - b.globalIndex);
          for (const { musicId, globalIndex } of sortedResults) {
            playlistService.insertMusicToPlaylist(newPlaylist.id, musicId, globalIndex);

            // Report progress using globalIndex (thread-safe, no race conditions)
            onProgress?.({
              stage: "audio",
              progress: Math.floor(5 + (globalIndex + 1) * progressPerMusic),
              message: `Finished ${globalIndex + 1}/${totalMusic}`,
            });
          }
        }

        onProgress?.({ stage: "metadata", progress: 100, message: "Complete!" });

        // Clean up browser window
        scraper.close();

        resolve(newPlaylist);
      } catch (error) {
        console.error("Error importing playlist:", error);

        // Ensure browser window is closed on error
        scraper.close();

        reject(error);
      }
    });
  });
}
