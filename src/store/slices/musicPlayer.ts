import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export interface MusicPlayerState {
  currentMusic?: MusicPiece;
  isPlaying: boolean;
  activePlaylist?: string;
}

const initialState: MusicPlayerState = {
  currentMusic: undefined,
  isPlaying: false,
  activePlaylist: undefined,
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
  },
});

export const { setCurrentMusic, setIsPlaying, setActivePlaylist } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
