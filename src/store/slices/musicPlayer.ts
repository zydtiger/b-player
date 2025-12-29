import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { MusicPiece } from "@@/shared/model";

export interface MusicPlayerState {
  currentMusic?: MusicPiece;
}

const initialState: MusicPlayerState = {
  currentMusic: undefined,
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setCurrentMusic(state, action: PayloadAction<MusicPiece>) {
      state.currentMusic = action.payload;
    },
  },
});

export const { setCurrentMusic } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
