import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export type PlaybackMode = "sequential" | "loop-single" | "shuffle";

export interface MusicPlayerState {
  queue: MusicPiece[];
  currentIndex: number;
  queueSourcePlaylist: string;
  isPlaying: boolean;
  activePlaylist: string;
  viewMode: "grid" | "list";
  isLoading: boolean;
  loadingMessage?: string;
  loadingProgress: number; // 0-100
  playbackMode: PlaybackMode;
  shuffleBuffer: number[];
  shuffleIndex: number;
}

const initialState: MusicPlayerState = {
  queue: [],
  currentIndex: -1,
  queueSourcePlaylist: "",
  isPlaying: false,
  activePlaylist: "Library",
  viewMode: "grid",
  isLoading: false,
  loadingMessage: undefined,
  loadingProgress: 0,
  playbackMode: "sequential",
  shuffleBuffer: [],
  shuffleIndex: 0,
};

/**
 * Shuffles an array using Fisher-Yates algorithm.
 * Returns a new shuffled array without modifying the original.
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setQueue(state, action: PayloadAction<{ queue: MusicPiece[]; index: number; source: string }>) {
      state.queue = action.payload.queue;
      state.currentIndex = action.payload.index;
      state.queueSourcePlaylist = action.payload.source;
      // Reset shuffle buffer when queue changes
      if (state.playbackMode === "shuffle" && state.queue.length > 0) {
        const otherIndices = state.queue.map((_, i) => i).filter((i) => i !== state.currentIndex);
        state.shuffleBuffer = shuffleArray(otherIndices);
        state.shuffleIndex = 0;
      }
    },
    setPlaybackMode(state, action: PayloadAction<PlaybackMode>) {
      state.playbackMode = action.payload;
      // When switching to shuffle, initialize shuffle buffer
      if (action.payload === "shuffle" && state.queue.length > 0) {
        // Create shuffled indices excluding current track
        const otherIndices = state.queue.map((_, i) => i).filter((i) => i !== state.currentIndex);
        state.shuffleBuffer = shuffleArray(otherIndices);
        state.shuffleIndex = 0;
      }
    },
    playNext(state) {
      if (state.queue.length === 0) return;

      switch (state.playbackMode) {
        case "loop-single":
          // Stay on current track - audio will loop
          return;
        case "shuffle":
          if (state.queue.length === 1) {
            return; // Single track - nothing to do
          }
          if (state.shuffleIndex < state.shuffleBuffer.length) {
            // Play next in shuffle buffer
            state.currentIndex = state.shuffleBuffer[state.shuffleIndex];
            state.shuffleIndex++;
          } else {
            // Buffer exhausted - reshuffle and continue
            const otherIndices = state.queue
              .map((_, i) => i)
              .filter((i) => i !== state.currentIndex);
            state.shuffleBuffer = shuffleArray(otherIndices);
            state.shuffleIndex = 0;
            state.currentIndex = state.shuffleBuffer[0];
            state.shuffleIndex = 1;
          }
          return;
        case "sequential":
        default:
          // Normal circular queue
          state.currentIndex = (state.currentIndex + 1) % state.queue.length;
      }
    },
    playPrev(state) {
      if (state.queue.length === 0) return;
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
      } else {
        state.currentIndex = state.queue.length - 1;
      }
    },
    jumpToIndex(state, action: PayloadAction<number>) {
      if (action.payload >= 0 && action.payload < state.queue.length) {
        state.currentIndex = action.payload;
      }
    },
    setIsPlaying(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
    setActivePlaylist(state, action: PayloadAction<string>) {
      state.activePlaylist = action.payload;
    },
    setViewMode(state, action: PayloadAction<"grid" | "list">) {
      state.viewMode = action.payload;
    },
    setLoading(
      state,
      action: PayloadAction<{ isLoading: boolean; message?: string; progress?: number }>,
    ) {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message;
      if (action.payload.progress !== undefined) {
        state.loadingProgress = action.payload.progress;
      }
    },
  },
});

export const {
  setQueue,
  playNext,
  playPrev,
  jumpToIndex,
  setIsPlaying,
  setActivePlaylist,
  setViewMode,
  setLoading,
  setPlaybackMode,
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
