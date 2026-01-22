import { createApi } from "@reduxjs/toolkit/query/react";
import { MusicPiece, Playlist, PlaylistWithMusic } from "@@/shared/model";

/**
 * Custom base query adapter for IPC communication
 * Transforms IPC calls into RTK Query-compatible format
 */
const ipcBaseQuery = async (args: { channel: string; args?: unknown[] }) => {
  try {
    const result = await window.ipcRenderer.invoke(args.channel, ...(args.args || []));
    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

/**
 * RTK Query API slice for music library management
 * Handles all IPC-based queries and mutations with automatic caching and refetching
 */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: ipcBaseQuery,
  tagTypes: ["MusicPiece", "Playlist", "PlaylistWithMusic"],
  endpoints: (builder) => ({
    // Queries
    getAllMusicPieces: builder.query<MusicPiece[], void>({
      query: () => ({ channel: "getAllMusicPieces" }),
      providesTags: ["MusicPiece"],
    }),

    getAllPlaylists: builder.query<Playlist[], void>({
      query: () => ({ channel: "getAllPlaylists" }),
      providesTags: ["Playlist"],
    }),

    getPlaylistWithMusic: builder.query<PlaylistWithMusic, number>({
      query: (id) => ({ channel: "getPlaylistWithMusic", args: [id] }),
      providesTags: (result, _error, id) =>
        result ? [{ type: "PlaylistWithMusic" as const, id }] : [],
    }),

    // Mutations
    deleteMusicPiece: builder.mutation<void, number>({
      query: (id) => ({ channel: "deleteMusicPiece", args: [id] }),
      invalidatesTags: ["MusicPiece", "PlaylistWithMusic"],
    }),

    removeMusicFromPlaylist: builder.mutation<void, { playlistId: number; musicId: number }>({
      query: ({ playlistId, musicId }) => ({
        channel: "removeMusicFromPlaylist",
        args: [playlistId, musicId],
      }),
      invalidatesTags: (_result, _error, { playlistId }) => [
        "Playlist",
        { type: "PlaylistWithMusic", id: playlistId },
      ],
    }),

    importMusic: builder.mutation<MusicPiece, string>({
      query: (url) => ({ channel: "importMusic", args: [url] }),
      invalidatesTags: ["MusicPiece", "PlaylistWithMusic"],
    }),

    importPlaylist: builder.mutation<Playlist, string>({
      query: (url) => ({ channel: "importPlaylist", args: [url] }),
      invalidatesTags: ["Playlist", "PlaylistWithMusic"],
    }),
  }),
});

export const {
  useGetAllMusicPiecesQuery,
  useGetAllPlaylistsQuery,
  useGetPlaylistWithMusicQuery,
  useDeleteMusicPieceMutation,
  useRemoveMusicFromPlaylistMutation,
  useImportMusicMutation,
  useImportPlaylistMutation,
} = apiSlice;
