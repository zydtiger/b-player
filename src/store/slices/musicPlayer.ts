import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export interface MusicPlayerState {
  currentMusicHash?: string;
  isPlaying: boolean;
}

const initialState: MusicPlayerState = {
  currentMusicHash: undefined,
  isPlaying: false,
};

const musicPlayerSlice = createSlice({
  name: "musicPlayer",
  initialState,
  reducers: {
    setCurrentMusicHash(state, action: PayloadAction<string>) {
      state.currentMusicHash = action.payload;
    },
    setIsPlaying(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
  },
});

export const { setCurrentMusicHash, setIsPlaying } = musicPlayerSlice.actions;

export default musicPlayerSlice.reducer;
