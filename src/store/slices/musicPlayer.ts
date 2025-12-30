import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export interface MusicPlayerState {
  currentMusic?: MusicPiece;
  isPlaying: boolean;
  activePlaylist: string;
  isLoading: boolean;
  loadingMessage?: string;
}

const initialState: MusicPlayerState = {
  currentMusic: undefined,
  isPlaying: false,
  activePlaylist: "Library",
  isLoading: false,
  loadingMessage: undefined,
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
    setLoading(state, action: PayloadAction<{ isLoading: boolean; message?: string }>) {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message;
    },
  },
});

export const { setCurrentMusic, setIsPlaying, setActivePlaylist, setLoading } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
