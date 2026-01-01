import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

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
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setQueue(state, action: PayloadAction<{ queue: MusicPiece[]; index: number; source: string }>) {
      state.queue = action.payload.queue;
      state.currentIndex = action.payload.index;
      state.queueSourcePlaylist = action.payload.source;
    },
    playNext(state) {
      if (state.queue.length === 0) return;
      state.currentIndex = (state.currentIndex + 1) % state.queue.length;
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
} = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
