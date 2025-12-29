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
      const fileSize = fileStats.size;

      // 1. Check for the Range header (e.g., "bytes=0-1023")
      const range = request.headers.get("range");

      if (range) {
        // Parse the range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range to prevent errors
        if (start >= fileSize || end >= fileSize) {
          return new Response("Requested Range Not Satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` },
          });
        }

        const chunkSize = end - start + 1;

        // Create a stream for the specific chunk
        const fileStream = fs.createReadStream(audioPath, { start, end });
        const webStream = Readable.toWeb(fileStream);

        return new Response(webStream as unknown as BodyInit, {
          status: 206,
          statusText: "Partial Content",
          headers: {
            "Content-Type": mime.lookup(audioPath) || "audio/mp4",
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      // 2. Default: Return full file (Status 200)
      const fileStream = fs.createReadStream(audioPath);
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": mime.lookup(audioPath) || "audio/mp4",
          "Content-Length": fileSize.toString(),
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
