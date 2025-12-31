import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export interface MusicPlayerState {
  currentMusic?: MusicPiece;
  isPlaying: boolean;
  activePlaylist: string;
  viewMode: "grid" | "list";
  isLoading: boolean;
  loadingMessage?: string;
  loadingProgress: number; // 0-100
}

const initialState: MusicPlayerState = {
  currentMusic: undefined,
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
    setCurrentMusic(state, action: PayloadAction<MusicPiece>) {
      state.currentMusic = action.payload;
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
    setLoading(state, action: PayloadAction<{ isLoading: boolean; message?: string; progress?: number }>) {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message;
      if (action.payload.progress !== undefined) {
        state.loadingProgress = action.payload.progress;
      }
    },
  },
});

export const { setCurrentMusic, setIsPlaying, setActivePlaylist, setViewMode, setLoading } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
