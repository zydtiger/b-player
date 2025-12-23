import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export interface MusicPlayerState {
  currentMusic?: MusicPiece;
  isPlaying: boolean;
}

const initialState: MusicPlayerState = {
  currentMusic: undefined,
  isPlaying: false,
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
  },
});

export const { setCurrentMusic, setIsPlaying } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
