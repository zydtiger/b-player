import crypto from "node:crypto";
import { BrowserWindow } from "electron";

import { downloadAudio, downloadThumbnail, getAudioStats } from "./utils";
import { MusicPiece, BasicEntity } from "../shared/model";

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
 * Imports music from URL by scraping webpage metadata and downloading audio.
 *
 * @param url The URL of the music page to scrape
 * @returns Promise<Omit<MusicPiece, keyof BasicEntity>> Music metadata without database entities
 * @throws Error if scraping fails, elements not found, or downloads fail
 */
export async function importMusic(url: string): Promise<Omit<MusicPiece, keyof BasicEntity>> {
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
        // Extract music metadata waiting for required elements
        const musicPartialResult = await waitForLogic<Omit<MusicPieceResult, "srcLink">>(
          scraper,
          // Self-executing function in browser context
          `(() => {
            // Select key elements
            const nameElem = document.querySelector("div.video-info-title");
            const imgElem = document.querySelector("img#wxwork-share-pic");
            const upElem = document.querySelector("a.up-name");

            if (!nameElem || !imgElem || !upElem) return null;

            const name = nameElem.innerText;
            const author = upElem.innerText.split(" ")[0];

            let imgSrc = imgElem.getAttribute("src");
            let authorLink = upElem.getAttribute("href");

            // Ensure URLs are absolute
            if (!imgSrc.startsWith("http")) imgSrc = "https:" + imgSrc;
            if (!authorLink.startsWith("http")) authorLink = "https:" + authorLink;

            // Skip default placeholder thumbnail
            if (imgSrc === "https://i0.hdslb.com/bfs/static/jinkela/long/images/512.png") {
              return null;
            }

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
        await downloadThumbnail(musicResult.imgSrc, hash);
        await downloadAudio(musicResult.srcLink, hash);

        // Get audio statistics
        const audioStats = await getAudioStats(hash);

        // Create music piece object (excludes database fields)
        const music: Omit<MusicPiece, keyof BasicEntity> = {
          name: musicResult.name,
          hash,
          srcLink: musicResult.srcLink,
          author: musicResult.author,
          authorLink: musicResult.authorLink,
          duration: audioStats.duration,
          fileSize: audioStats.fileSize,
          playCount: 0,
        };

        // Clean up browser window
        scraper.close();

        resolve(music);
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
