import { protocol } from "electron";
import fs from "node:fs";
import { Readable } from "node:stream";

import mime from "mime-types";

import { getAudioPath, getThumbnailPath } from "./utils";

/**
 * Registers custom protocol schemes - must be called before app is ready
 * thumbnail://<hash> -> thumbnail file
 * audio://<hash> -> audio file
 */
export function registerMediaSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "thumbnail",
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: false,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
    {
      scheme: "audio",
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: false,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

/**
 * Registers protocol handlers - must be called after app is ready
 */
export function registerMediaHandlers(): void {
  // Handle thumbnail requests
  protocol.handle("thumbnail", async (request) => {
    try {
      // Extract hash from URL: thumbnail://<hash>
      const url = new URL(request.url);
      const hash = url.hostname;

      if (!hash) {
        return new Response("Bad Request: Missing hash", { status: 400 });
      }

      // Get thumbnail file path
      const thumbnailPath = await getThumbnailPath(hash);

      // Create file stream and return response
      const fileStream = fs.createReadStream(thumbnailPath);
      const webStream = Readable.toWeb(fileStream);
      return new Response(webStream as unknown as BodyInit, {
        headers: {
          "Content-Type": mime.lookup(thumbnailPath) || "image/webp",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Error serving thumbnail:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  // Handle audio requests
  protocol.handle("audio", async (request) => {
    try {
      // Extract hash from URL: audio://<hash>
      const url = new URL(request.url);
      const hash = url.hostname;

      if (!hash) {
        return new Response("Bad Request: Missing hash", { status: 400 });
      }

      // Get audio file path
      const audioPath = await getAudioPath(hash);

      // Get file stats for content length
      const fileStats = await fs.promises.stat(audioPath);

      // Create file stream and return response
      const fileStream = fs.createReadStream(audioPath);
      const webStream = Readable.toWeb(fileStream);
      return new Response(webStream as unknown as BodyInit, {
        headers: {
          "Content-Type": mime.lookup(audioPath) || "audio/mp4",
          "Content-Length": fileStats.size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Error serving audio:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
}
